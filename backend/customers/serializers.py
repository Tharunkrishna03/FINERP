from datetime import date
from decimal import Decimal

from rest_framework import serializers

from .models import (
    Customer,
    CustomerTransaction,
    Installment,
    JewelDetail,
    Payment,
    CustomerProfile,
    UserProfile,
    UserAvatar,
)


class InstallmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Installment
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = "__all__"
        read_only_fields = ("id", "created_at")


class JewelDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = JewelDetail
        fields = "__all__"
        read_only_fields = ("id", "transaction", "created_at", "updated_at")

    def validate_weight(self, value):
        if value < 0:
            raise serializers.ValidationError("Weight cannot be negative.")
        return value

    def validate_num_stones(self, value):
        if value < 0:
            raise serializers.ValidationError("Number of stones cannot be negative.")
        return value


class CustomerTransactionSerializer(serializers.ModelSerializer):
    jewel = JewelDetailSerializer(read_only=True)

    class Meta:
        model = CustomerTransaction
        fields = "__all__"
        read_only_fields = (
            "id", "customer", "interest_amount", "created_at", "updated_at"
        )

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Transaction amount must be greater than zero.")
        return value

    def validate_tenure(self, value):
        if value < 1:
            raise serializers.ValidationError("Transaction tenure must be at least one month.")
        return value


class CustomerAccountSummarySerializer(serializers.ModelSerializer):
    transactions = CustomerTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = (
            "id", "sno", "ano", "amount", "date", "status", "item_type",
            "metal_type", "purity", "weight", "num_stones", "total_payable",
            "amount_paid", "photo", "transactions",
        )


class CustomerProfileSerializer(serializers.ModelSerializer):
    accounts = CustomerAccountSummarySerializer(many=True, read_only=True)
    account_count = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = CustomerProfile
        fields = (
            "id", "customer_name", "guardian_name", "phone", "customer_id_no",
            "address", "accounts", "account_count", "status", "created_at", "updated_at",
        )
        read_only_fields = ("id", "customer_id_no", "created_at", "updated_at")

    def get_account_count(self, obj):
        accounts = getattr(obj, "_prefetched_objects_cache", {}).get("accounts")
        return len(accounts) if accounts is not None else obj.accounts.count()

    def get_status(self, obj):
        return "Active" if self.get_account_count(obj) else "Inactive"


class CustomerSerializer(serializers.ModelSerializer):
    installments = InstallmentSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    transactions = CustomerTransactionSerializer(many=True, read_only=True)
    profile = serializers.PrimaryKeyRelatedField(
        queryset=CustomerProfile.objects.all(), required=False, allow_null=True
    )
    sno = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    ano = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Customer
        fields = "__all__"
        read_only_fields = (
            "id",
            "customer_id_no",
            "total_interest",
            "total_payable",
            "amount_paid",
            "status",
            "tenure_call_done",
            "created_at",
            "updated_at",
        )

    def to_internal_value(self, data):
        # Preserve the stored file when callers send its existing URL during an edit.
        if "photo" in data and isinstance(data["photo"], str):
            mutable_data = data.copy()
            mutable_data.pop("photo", None)
            data = mutable_data
        return super().to_internal_value(data)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Loan amount must be greater than zero.")
        return value

    def validate_tenure(self, value):
        if value < 1:
            raise serializers.ValidationError("Loan tenure must be at least one month.")
        return value

    def validate_interest_rate(self, value):
        if value < 0:
            raise serializers.ValidationError("Interest rate cannot be negative.")
        return value

    def validate_weight(self, value):
        if value < 0:
            raise serializers.ValidationError("Weight cannot be negative.")
        return value

    def validate_tenure_date_overrides(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "Tenure date overrides must map month numbers to ISO dates."
            )

        normalized = {}
        for month_number, override_date in value.items():
            try:
                month_number = int(month_number)
            except (TypeError, ValueError):
                raise serializers.ValidationError(
                    "Each tenure date override key must be a month number."
                )
            if month_number < 1:
                raise serializers.ValidationError(
                    "Tenure date override month numbers must be positive."
                )
            try:
                parsed_date = date.fromisoformat(str(override_date))
            except (TypeError, ValueError):
                raise serializers.ValidationError(
                    "Tenure date overrides must use YYYY-MM-DD dates."
                )
            normalized[str(month_number)] = parsed_date.isoformat()
        return normalized

    def validate_num_stones(self, value):
        if value < 0:
            raise serializers.ValidationError("Number of stones cannot be negative.")
        return value

    def validate(self, attrs):
        tenure = attrs.get(
            "tenure", self.instance.tenure if self.instance else None
        )
        date_overrides = attrs.get(
            "tenure_date_overrides",
            self.instance.tenure_date_overrides if self.instance else {},
        )
        if tenure and any(int(month_number) > tenure for month_number in date_overrides):
            raise serializers.ValidationError({
                "tenure_date_overrides": "An override cannot exceed the loan tenure."
            })

        if self.instance:
            terms = ("amount", "date", "interest_rate", "tenure")
            changed = any(
                name in attrs and attrs[name] != getattr(self.instance, name)
                for name in terms
            )
            has_recorded_payment = self.instance.payments.exclude(
                payment_mode="Upfront Deduction"
            ).exists()
            if changed and has_recorded_payment:
                raise serializers.ValidationError(
                    "Loan amount, date, rate, or tenure cannot be changed after a payment has been recorded."
                )
        return attrs


class PaymentCreateSerializer(serializers.Serializer):
    payment_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal("0.01")
    )
    payment_date = serializers.DateField()
    payment_mode = serializers.CharField(max_length=50, required=False, default="Cash")
    reference_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    remarks = serializers.CharField(required=False, allow_blank=True)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ("id", "user_name", "role", "sno_format", "ano_format", "customer_id_no_format")


class UserAvatarSerializer(serializers.ModelSerializer):
    image = serializers.ImageField()

    class Meta:
        model = UserAvatar
        fields = ("image",)
