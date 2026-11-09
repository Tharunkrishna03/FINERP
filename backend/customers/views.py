from decimal import Decimal

from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import generics, status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth.models import User
from .models import (
    USER_MODULE_KEYS,
    Customer,
    CustomerProfile,
    CustomerTransaction,
    Payment,
    UserModuleAccess,
    UserAvatar,
    UserProfile,
    get_user_role,
    get_role_default_modules,
)
from .serializers import (
    CustomerSerializer,
    CustomerProfileSerializer,
    CustomerTransactionSerializer,
    JewelDetailSerializer,
    PaymentCreateSerializer,
    UserAvatarSerializer,
    UserProfileSerializer,
)
from .services import CustomerService, AuthService


def get_visible_modules(user):
    if user.is_superuser:
        return list(USER_MODULE_KEYS)

    try:
        modules = user.module_access.visible_modules
    except UserModuleAccess.DoesNotExist:
        return get_role_default_modules(get_user_role(user))

    selected = set(modules if isinstance(modules, list) else [])
    return [module for module in USER_MODULE_KEYS if module in selected]


class ModuleAccessPermission(BasePermission):
    """Require the signed-in user to have access to the endpoint's module."""

    message = "Your account does not have access to this module."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        module = getattr(view, "required_module", None)
        if not module or user.is_superuser:
            return True
        try:
            modules = user.module_access.visible_modules
            return isinstance(modules, list) and module in modules
        except UserModuleAccess.DoesNotExist:
            return module in get_role_default_modules(get_user_role(user))


def replace_user_avatar(user, uploaded_image):
    avatar, _ = UserAvatar.objects.get_or_create(user=user)
    old_image = avatar.image
    old_name = old_image.name if old_image else None
    old_storage = old_image.storage if old_image else None

    avatar.image = uploaded_image
    avatar.save(update_fields=["image"])

    new_name = avatar.image.name
    if old_name and old_storage and old_name != new_name:
        try:
            old_storage.delete(old_name)
        except Exception:
            # The new avatar is already stored; cleanup failure should not
            # report the successful upload as a failure.
            pass
    return avatar


def get_user_profile_image_url(user, profile=None, avatar=None):
    """Return the current avatar URL, falling back to the legacy profile field."""
    if avatar is None:
        avatar = UserAvatar.objects.filter(user=user).first()
    if avatar and avatar.image:
        return avatar.image.url

    if profile is None:
        profile = UserProfile.objects.filter(user=user).first()
    if profile and profile.profile_image:
        return profile.profile_image.url
    return None

class CustomerListCreateView(generics.ListCreateAPIView):
    permission_classes = (ModuleAccessPermission,)
    required_module = "customers"
    queryset = Customer.objects.prefetch_related(
        "installments", "payments", "transactions__jewel"
    )
    serializer_class = CustomerSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        sequence_profile = CustomerService.get_identifier_profile(self.request.user)
        sequence_profile = UserProfile.objects.select_for_update().get(
            pk=sequence_profile.pk
        )
        profile = serializer.validated_data.get("profile")
        if profile is None:
            customer_id_no = CustomerService.get_next_number(
                "customer_id_no", sequence_profile.customer_id_no_format
            )
            profile = CustomerProfile.objects.create(
                customer_name=serializer.validated_data["customer_name"],
                guardian_name=serializer.validated_data["guardian_name"],
                phone=serializer.validated_data["phone"],
                customer_id_no=customer_id_no,
                address=serializer.validated_data.get("address"),
            )
        customer = serializer.save(
            profile=profile,
            customer_name=profile.customer_name,
            guardian_name=profile.guardian_name,
            phone=profile.phone,
            customer_id_no=profile.customer_id_no,
            address=profile.address,
        )
        CustomerService.assign_identifiers(customer, sequence_profile)
        CustomerService.rebuild_loan_schedule(customer)


class CustomerProfileListCreateView(generics.ListCreateAPIView):
    permission_classes = (ModuleAccessPermission,)
    required_module = "customers"
    serializer_class = CustomerProfileSerializer
    queryset = CustomerProfile.objects.prefetch_related(
        "accounts", "accounts__transactions__jewel"
    ).order_by("-id")

    @transaction.atomic
    def perform_create(self, serializer):
        sequence_profile = CustomerService.get_identifier_profile(self.request.user)
        sequence_profile = UserProfile.objects.select_for_update().get(
            pk=sequence_profile.pk
        )
        customer_id_no = CustomerService.get_next_number(
            "customer_id_no", sequence_profile.customer_id_no_format
        )
        serializer.save(customer_id_no=customer_id_no)


class CustomerProfileRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (ModuleAccessPermission,)
    required_module = "customers"
    serializer_class = CustomerProfileSerializer
    queryset = CustomerProfile.objects.prefetch_related(
        "accounts", "accounts__transactions__jewel"
    )

    @transaction.atomic
    def perform_update(self, serializer):
        profile = serializer.save()
        profile.accounts.update(
            customer_name=profile.customer_name,
            guardian_name=profile.guardian_name,
            phone=profile.phone,
            customer_id_no=profile.customer_id_no,
            address=profile.address,
        )
        profile._prefetched_objects_cache = {}

class CustomerRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (ModuleAccessPermission,)
    required_module = "customers"
    serializer_class = CustomerSerializer

    def get_queryset(self):
        queryset = Customer.objects.prefetch_related(
            "installments", "payments", "transactions__jewel"
        )
        if self.request.method in {"PUT", "PATCH"}:
            queryset = queryset.select_for_update()
        return queryset

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @transaction.atomic
    def perform_update(self, serializer):
        old_terms = {
            field: getattr(serializer.instance, field)
            for field in ("amount", "date", "interest_rate", "tenure")
        }
        old_date_overrides = dict(serializer.instance.tenure_date_overrides or {})
        customer = serializer.save()
        if customer.profile_id:
            customer.customer_name = customer.profile.customer_name
            customer.guardian_name = customer.profile.guardian_name
            customer.phone = customer.profile.phone
            customer.customer_id_no = customer.profile.customer_id_no
            customer.address = customer.profile.address
            customer.save(update_fields=[
                "customer_name", "guardian_name", "phone", "customer_id_no",
                "address", "updated_at",
            ])
        terms_changed = any(
            getattr(customer, field) != value for field, value in old_terms.items()
        )
        tenure_dates_changed = customer.tenure_date_overrides != old_date_overrides
        if terms_changed or tenure_dates_changed:
            if customer.tenure_call_done:
                customer.tenure_call_done = False
                customer.save(update_fields=["tenure_call_done"])
        if terms_changed:
            CustomerService.rebuild_loan_schedule(customer)
        elif tenure_dates_changed:
            CustomerService.apply_tenure_date_overrides(customer)


class CustomerTenureCallDoneAPIView(APIView):
    permission_classes = (ModuleAccessPermission,)
    required_module = "customers"
    @transaction.atomic
    def post(self, request, customer_pk, *args, **kwargs):
        customer = get_object_or_404(
            Customer.objects.select_for_update(), pk=customer_pk
        )
        if not customer.tenure_call_done:
            customer.tenure_call_done = True
            customer.save(update_fields=["tenure_call_done"])
        return Response({"id": customer.pk, "tenure_call_done": True})

class PaymentCreateAPIView(APIView):
    permission_classes = (ModuleAccessPermission,)
    required_module = "customers"
    @transaction.atomic
    def post(self, request, customer_pk, *args, **kwargs):
        input_serializer = PaymentCreateSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        customer = get_object_or_404(
            Customer.objects.select_for_update(), pk=customer_pk
        )
        payment_data = input_serializer.validated_data
        payment_amount = payment_data["payment_amount"]
        
        if payment_amount <= 0:
            return Response({"error": "Payment amount must be greater than 0"}, status=status.HTTP_400_BAD_REQUEST)
            
        payment_date = payment_data["payment_date"]
        
        outstanding_balance = customer.total_payable - customer.amount_paid
        if payment_amount > outstanding_balance:
            return Response({"error": "Payment exceeds outstanding balance"}, status=status.HTTP_400_BAD_REQUEST)

        # Allocate payment strictly sequentially across unpaid installments (Interest -> Principal)
        remaining_payment = payment_amount
        total_principal_paid = Decimal('0.00')
        total_interest_paid = Decimal('0.00')
        
        installments = list(
            customer.installments.select_for_update()
            .exclude(status="Paid")
            .order_by("month_number")
        )
        
        for inst in installments:
            if remaining_payment <= 0:
                break
                
            prev_paid = inst.amount_paid
            
            # Allocation rule: Interest First
            prev_interest_paid = min(prev_paid, inst.interest_due)
            prev_principal_paid = prev_paid - prev_interest_paid
            
            unpaid_interest = inst.interest_due - prev_interest_paid
            unpaid_principal = inst.principal_due - prev_principal_paid
            
            # 1. Pay Interest
            paying_interest = min(unpaid_interest, remaining_payment)
            remaining_payment -= paying_interest
            total_interest_paid += paying_interest
            
            # 2. Pay Principal
            paying_principal = min(unpaid_principal, remaining_payment)
            remaining_payment -= paying_principal
            total_principal_paid += paying_principal
            
            # Update installment
            inst.amount_paid += (paying_interest + paying_principal)
            
            if inst.amount_paid >= inst.total_due:
                inst.status = 'Paid'
                inst.paid_date = payment_date
            elif inst.amount_paid > 0:
                inst.status = 'Partially Paid'
                inst.paid_date = None
            
            inst.save()

        # Create payment record
        Payment.objects.create(
            customer=customer,
            payment_amount=payment_amount,
            principal_portion=total_principal_paid,
            interest_portion=total_interest_paid,
            payment_date=payment_date,
            payment_mode=payment_data.get("payment_mode", "Cash"),
            reference_number=payment_data.get("reference_number", ""),
            remarks=payment_data.get("remarks", ""),
        )
        
        customer.amount_paid += payment_amount
        if customer.amount_paid >= customer.total_payable:
            customer.status = 'Completed'
        customer.save()
        
        return Response({"message": "Payment recorded successfully", "outstanding_balance": outstanding_balance - payment_amount}, status=status.HTTP_201_CREATED)


class CustomerTransactionListCreateView(APIView):
    permission_classes = (ModuleAccessPermission,)
    required_module = "transactions"
    parser_classes = (MultiPartParser, FormParser)

    def get(self, request, customer_pk, *args, **kwargs):
        customer = get_object_or_404(Customer, pk=customer_pk)
        transactions = customer.transactions.select_related("jewel").order_by("date", "id")
        serializer = CustomerTransactionSerializer(transactions, many=True)
        return Response(serializer.data)

    def post(self, request, customer_pk, *args, **kwargs):
        customer = get_object_or_404(Customer, pk=customer_pk)
        transaction_serializer = CustomerTransactionSerializer(data=request.data)
        jewel_serializer = JewelDetailSerializer(data=request.data)

        transaction_is_valid = transaction_serializer.is_valid()
        jewel_is_valid = jewel_serializer.is_valid()
        if not transaction_is_valid or not jewel_is_valid:
            return Response(
                {
                    'transaction': transaction_serializer.errors,
                    'jewel': jewel_serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        customer_transaction = CustomerService.create_transaction_and_jewel(
            customer=customer,
            transaction_serializer=transaction_serializer,
            jewel_serializer=jewel_serializer
        )

        return Response(CustomerTransactionSerializer(customer_transaction).data, status=status.HTTP_201_CREATED)


class CustomerTransactionDestroyView(generics.DestroyAPIView):
    permission_classes = (ModuleAccessPermission,)
    required_module = "transactions"
    queryset = CustomerTransaction.objects.all()
    serializer_class = CustomerTransactionSerializer


class UserProfileView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile

    def get(self, request, *args, **kwargs):
        profile = self.get_object()
        user = request.user
        sequence_profile = CustomerService.get_identifier_profile(user)
        
        avatar = UserAvatar.objects.filter(user=user).first() if (user and user.is_authenticated) else None
        user_name = profile.user_name.strip() if profile.user_name else ""
        if not user_name or user_name == "John Doe":
            user_name = user.username if (user and user.is_authenticated) else ""
        role = get_user_role(user)
        is_superuser = bool(user and user.is_authenticated and user.is_superuser)
        visible_modules = get_visible_modules(user) if (user and user.is_authenticated) else []

        data = {
            "id": profile.id,
            "user_name": user_name,
            "username": user.username if (user and user.is_authenticated) else "",
            "role": role,
            "profile_image": get_user_profile_image_url(user, profile, avatar),
            "is_superuser": is_superuser,
            "visible_modules": visible_modules,
            "sno_format": sequence_profile.sno_format,
            "ano_format": sequence_profile.ano_format,
            "customer_id_no_format": sequence_profile.customer_id_no_format,
            "next_sno": CustomerService.get_next_number("sno", sequence_profile.sno_format),
            "next_ano": CustomerService.get_next_number("ano", sequence_profile.ano_format),
            "next_customer_id_no": CustomerService.get_next_number("customer_id_no", sequence_profile.customer_id_no_format),
        }
        return Response(data)

    def put(self, request, *args, **kwargs):
        user = request.user
        if not user or not user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        profile = self.get_object()
        sequence_profile = CustomerService.get_identifier_profile(user)

        sequence_fields = (
            "sno_format",
            "ano_format",
            "customer_id_no_format",
        )
        sequence_data = {
            field: request.data.get(field)
            for field in sequence_fields
            if field in request.data
        }
        sequence_serializer = None
        if user.is_superuser and sequence_data:
            sequence_serializer = UserProfileSerializer(
                sequence_profile, data=sequence_data, partial=True
            )
            if not sequence_serializer.is_valid():
                return Response(
                    sequence_serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST,
                )

        uploaded_image = request.FILES.get("profile_image") or request.FILES.get("image")
        if uploaded_image:
            image_serializer = UserAvatarSerializer(data={"image": uploaded_image})
            if not image_serializer.is_valid():
                return Response(
                    image_serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST,
                )
            uploaded_image = image_serializer.validated_data["image"]

        # The profile display name stays separate from the immutable login username.
        new_name = request.data.get("user_name")
        if new_name is not None:
            new_name = str(new_name).strip()
            if not new_name:
                return Response(
                    {"user_name": "Full name cannot be empty."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            profile.user_name = new_name
            profile.save(update_fields=["user_name"])

        # 2. Update individual avatar if passed in PUT
        if uploaded_image:
            avatar = replace_user_avatar(user, uploaded_image)

        # System sequence formats are shared and only administrators can change them.
        if sequence_serializer is not None:
            sequence_serializer.save()

        avatar = UserAvatar.objects.filter(user=user).first()
        data = {
            "id": profile.id,
            "user_name": (
                profile.user_name
                if profile.user_name and profile.user_name != "John Doe"
                else user.username
            ),
            "username": user.username,
            "role": get_user_role(user),
            "profile_image": get_user_profile_image_url(user, profile, avatar),
            "is_superuser": bool(user.is_superuser),
            "visible_modules": get_visible_modules(user),
            "sno_format": sequence_profile.sno_format,
            "ano_format": sequence_profile.ano_format,
            "customer_id_no_format": sequence_profile.customer_id_no_format,
            "next_sno": CustomerService.get_next_number("sno", sequence_profile.sno_format),
            "next_ano": CustomerService.get_next_number("ano", sequence_profile.ano_format),
            "next_customer_id_no": CustomerService.get_next_number("customer_id_no", sequence_profile.customer_id_no_format),
        }
        return Response(data)


class UserAvatarView(APIView):
    permission_classes = (IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        serializer = UserAvatarSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        avatar = replace_user_avatar(request.user, serializer.validated_data["image"])
        return Response({"profile_image": avatar.image.url})

    def delete(self, request, *args, **kwargs):
        avatar = UserAvatar.objects.filter(user=request.user).first()
        if avatar and avatar.image:
            try:
                avatar.image.delete(save=False)
            except Exception:
                pass
            avatar.delete()
        return Response({"profile_image": None, "message": "Avatar removed successfully"})


class ChangePasswordView(APIView):
    def post(self, request, *args, **kwargs):
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")
        if not current_password:
            return Response({"error": "Current password is required"}, status=400)
        if not new_password:
            return Response({"error": "New password is required"}, status=400)

        user = request.user
        if not AuthService.verify_password(user, current_password):
            return Response({"error": "Current password is incorrect"}, status=400)
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as error:
            return Response({"error": list(error.messages)}, status=400)

        AuthService.update_password(user, new_password)
        return Response({"message": "Password updated successfully"})

class VerifyPasswordView(APIView):
    def post(self, request, *args, **kwargs):
        old_password = request.data.get("old_password")
        if not old_password:
            return Response({"error": "Old password is required"}, status=400)
            
        user = request.user
        if AuthService.verify_password(user, old_password):
            return Response({"valid": True})
        else:
            return Response({"valid": False})

class CreateUserView(APIView):
    """Only superusers can create new users."""
    def post(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({"error": "Only admin can create users"}, status=status.HTTP_403_FORBIDDEN)
        
        username_value = request.data.get("username", "")
        username = username_value.strip() if isinstance(username_value, str) else ""
        user_name_value = request.data.get("user_name", "")
        user_name = user_name_value.strip() if isinstance(user_name_value, str) else ""
        password = request.data.get("password", "")
        role_value = request.data.get("role", "Staff")
        role = role_value.strip() if isinstance(role_value, str) else "Staff"
        if role not in ["Administrator", "Manager", "Staff"]:
            role = "Staff"
            
        visible_modules = request.data.get("visible_modules")
        
        if not username or not password:
            return Response({"error": "Username and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        if visible_modules is None:
            selected_modules = get_role_default_modules(role)
        elif not isinstance(visible_modules, list):
            return Response(
                {"error": "Select the modules this user can see"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        else:
            if not all(isinstance(module, str) for module in visible_modules):
                return Response(
                    {"error": "One or more selected modules are invalid"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            selected_modules = list(dict.fromkeys(visible_modules))
            invalid_modules = [
                module for module in selected_modules if module not in USER_MODULE_KEYS
            ]
            if invalid_modules:
                return Response(
                    {"error": "One or more selected modules are invalid"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not selected_modules:
                return Response(
                    {"error": "Select at least one module for this user"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        
        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password)
        except DjangoValidationError as error:
            return Response({"error": list(error.messages)}, status=status.HTTP_400_BAD_REQUEST)
        
        is_admin_role = (role.lower() == "administrator")
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                password=password,
                is_staff=is_admin_role,
                is_superuser=is_admin_role,
            )
            UserModuleAccess.objects.create(
                user=user,
                visible_modules=selected_modules,
                role=role,
            )
            UserProfile.objects.create(
                user=user,
                user_name=user_name or username,
            )
        return Response(
            {
                "message": f"User '{user.username}' created successfully",
                "id": user.id,
                "username": user.username,
                "user_name": user_name or username,
                "role": role,
                "visible_modules": selected_modules,
            },
            status=status.HTTP_201_CREATED,
        )

class ListUsersView(APIView):
    """Only superusers can list users."""
    def get(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({"error": "Only admin can view users"}, status=status.HTTP_403_FORBIDDEN)
        
        access_by_user = {
            access.user_id: access
            for access in UserModuleAccess.objects.select_related("user").all()
        }
        profiles_by_user = {
            profile.user_id: profile
            for profile in UserProfile.objects.filter(user__isnull=False)
        }
        avatars_by_user = {
            a.user_id: a.image.url
            for a in UserAvatar.objects.filter(image__isnull=False)
            if a.image
        }
        users = User.objects.all().order_by("-date_joined")
        return Response([
            {
                "id": user.id,
                "username": user.username,
                "user_name": (
                    profiles_by_user[user.id].user_name
                    if user.id in profiles_by_user
                    and profiles_by_user[user.id].user_name not in {None, "", "John Doe"}
                    else user.username
                ),
                "role": get_user_role(user),
                "is_superuser": user.is_superuser,
                "is_active": user.is_active,
                "date_joined": user.date_joined,
                "profile_image": avatars_by_user.get(user.id)
                or (
                    profiles_by_user[user.id].profile_image.url
                    if user.id in profiles_by_user and profiles_by_user[user.id].profile_image
                    else None
                ),
                "visible_modules": (
                    list(USER_MODULE_KEYS)
                    if user.is_superuser
                    else [
                        module
                        for module in USER_MODULE_KEYS
                        if module in (
                            access_by_user[user.id].visible_modules
                            if user.id in access_by_user
                            else get_role_default_modules(get_user_role(user))
                        )
                    ]
                ),
            }
            for user in users
        ])

class DeleteUserView(APIView):
    """Only superusers can delete users."""
    def delete(self, request, pk, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({"error": "Only admin can delete users"}, status=status.HTTP_403_FORBIDDEN)
        
        user = get_object_or_404(User, pk=pk)
        if user.is_superuser:
            return Response({"error": "Cannot delete a superuser account"}, status=status.HTTP_400_BAD_REQUEST)
        
        username = user.username
        user.delete()
        return Response({"message": f"User '{username}' deleted successfully"})
