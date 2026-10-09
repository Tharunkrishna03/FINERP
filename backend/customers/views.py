from decimal import Decimal

from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import generics, status
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
    UserProfile,
)
from .serializers import (
    CustomerSerializer,
    CustomerProfileSerializer,
    CustomerTransactionSerializer,
    JewelDetailSerializer,
    PaymentCreateSerializer,
    UserProfileSerializer,
)
from .services import CustomerService, AuthService


def get_visible_modules(user):
    if user.is_superuser:
        return list(USER_MODULE_KEYS)

    try:
        modules = user.module_access.visible_modules
    except UserModuleAccess.DoesNotExist:
        return list(USER_MODULE_KEYS)

    selected = set(modules if isinstance(modules, list) else [])
    return [module for module in USER_MODULE_KEYS if module in selected]

class CustomerListCreateView(generics.ListCreateAPIView):
    queryset = Customer.objects.prefetch_related(
        "installments", "payments", "transactions__jewel"
    )
    serializer_class = CustomerSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        profile = serializer.validated_data.get("profile")
        if profile is None:
            user_profile, _ = UserProfile.objects.select_for_update().get_or_create(pk=1)
            customer_id_no = CustomerService.get_next_number(
                "customer_id_no", user_profile.customer_id_no_format
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
        CustomerService.assign_identifiers(customer)
        CustomerService.rebuild_loan_schedule(customer)


class CustomerProfileListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomerProfileSerializer
    queryset = CustomerProfile.objects.prefetch_related(
        "accounts", "accounts__transactions__jewel"
    ).order_by("-id")

    @transaction.atomic
    def perform_create(self, serializer):
        user_profile, _ = UserProfile.objects.select_for_update().get_or_create(pk=1)
        customer_id_no = CustomerService.get_next_number(
            "customer_id_no", user_profile.customer_id_no_format
        )
        serializer.save(customer_id_no=customer_id_no)


class CustomerProfileRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
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
    queryset = CustomerTransaction.objects.all()
    serializer_class = CustomerTransactionSerializer


class UserProfileView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def get_object(self):
        profile, created = UserProfile.objects.get_or_create(id=1)
        return profile

    def get(self, request, *args, **kwargs):
        profile = self.get_object()
        if request.user and request.user.is_authenticated and request.user.username:
            if profile.user_name != request.user.username:
                profile.user_name = request.user.username
                profile.save(update_fields=["user_name"])
                
        serializer = UserProfileSerializer(profile)
        data = dict(serializer.data)
        data["visible_modules"] = get_visible_modules(request.user)
        if request.user and request.user.is_authenticated and request.user.username:
            data['user_name'] = request.user.username
            
        data['next_sno'] = CustomerService.get_next_number("sno", profile.sno_format)
        data['next_ano'] = CustomerService.get_next_number("ano", profile.ano_format)
        data['next_customer_id_no'] = CustomerService.get_next_number("customer_id_no", profile.customer_id_no_format)
        
        return Response(data)

    def put(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({"error": "Only admin can update shared profile settings"}, status=403)
        profile = self.get_object()
        
        new_name = request.data.get("user_name")
        if new_name and request.user and request.user.is_authenticated:
            new_name = str(new_name).strip()
            if new_name and new_name != request.user.username:
                request.user.username = new_name
                request.user.save(update_fields=["username"])
                
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            profile_instance = serializer.save()
            if request.user and request.user.is_authenticated and request.user.username:
                profile_instance.user_name = request.user.username
                profile_instance.save(update_fields=["user_name"])
                
            data = dict(serializer.data)
            if request.user and request.user.is_authenticated and request.user.username:
                data['user_name'] = request.user.username
            data['next_sno'] = CustomerService.get_next_number("sno", profile.sno_format)
            data['next_ano'] = CustomerService.get_next_number("ano", profile.ano_format)
            data['next_customer_id_no'] = CustomerService.get_next_number("customer_id_no", profile.customer_id_no_format)
            return Response(data)
        return Response(serializer.errors, status=400)

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
        password = request.data.get("password", "")
        visible_modules = request.data.get("visible_modules")
        
        if not username or not password:
            return Response({"error": "Username and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(visible_modules, list):
            return Response(
                {"error": "Select the modules this user can see"},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
        
        with transaction.atomic():
            user = User.objects.create_user(username=username, password=password)
            UserModuleAccess.objects.create(
                user=user,
                visible_modules=selected_modules,
            )
        return Response(
            {
                "message": f"User '{user.username}' created successfully",
                "visible_modules": selected_modules,
            },
            status=status.HTTP_201_CREATED,
        )

class ListUsersView(APIView):
    """Only superusers can list users."""
    def get(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({"error": "Only admin can view users"}, status=status.HTTP_403_FORBIDDEN)
        
        access_by_user = dict(
            UserModuleAccess.objects.values_list("user_id", "visible_modules")
        )
        users = User.objects.all()
        return Response([
            {
                "id": user.id,
                "username": user.username,
                "is_superuser": user.is_superuser,
                "is_active": user.is_active,
                "date_joined": user.date_joined,
                "visible_modules": (
                    list(USER_MODULE_KEYS)
                    if user.is_superuser
                    else [
                        module
                        for module in USER_MODULE_KEYS
                        if module in access_by_user.get(user.id, USER_MODULE_KEYS)
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
