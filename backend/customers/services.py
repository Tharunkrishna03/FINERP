from datetime import date
from decimal import Decimal
from django.db import transaction
from decimal import ROUND_HALF_UP
from dateutil.relativedelta import relativedelta
from .models import Customer, CustomerProfile, CustomerTransaction, Installment, Payment, UserProfile

import re

class CustomerService:
    @staticmethod
    def tenure_due_date(customer, month_number, previous_date):
        overrides = customer.tenure_date_overrides
        if not isinstance(overrides, dict):
            overrides = {}

        override = overrides.get(str(month_number), overrides.get(month_number))
        if override:
            if isinstance(override, date):
                return override
            return date.fromisoformat(str(override))

        return previous_date + relativedelta(months=1) - relativedelta(days=1)

    @staticmethod
    def apply_tenure_date_overrides(customer):
        previous_date = customer.date
        for installment in customer.installments.order_by("month_number"):
            due_date = CustomerService.tenure_due_date(
                customer, installment.month_number, previous_date
            )
            if installment.due_date != due_date:
                installment.due_date = due_date
                installment.save(update_fields=["due_date", "updated_at"])
            previous_date = due_date

    @staticmethod
    def get_next_number(field_name, format_str="", exclude_pk=None):
        """
        Calculates the next auto-increment integer based on configured format_str in UserProfile
        and existing DB records.
        Parses prefix, start_number, and number_width (e.g., '100' -> start 100, width 3;
        'SNO-100' -> prefix 'SNO-', start 100, width 3).
        """
        configured_format = str(format_str or "").strip()
        match = re.match(r"^(.*?)(\d+)$", configured_format)
        if match:
            prefix, start_value = match.groups()
            start_number = max(int(start_value), 1)
            number_width = len(start_value)
        else:
            prefix = configured_format
            start_number = 1
            number_width = 0

        customers = Customer.objects.exclude(**{f"{field_name}__isnull": True}).exclude(**{field_name: ""})
        if exclude_pk:
            customers = customers.exclude(pk=exclude_pk)
        values = list(customers.values_list(field_name, flat=True))

        if field_name == "customer_id_no":
            values.extend(
                CustomerProfile.objects.exclude(customer_id_no__isnull=True)
                .exclude(customer_id_no="")
                .values_list("customer_id_no", flat=True)
            )

        next_number = start_number
        for value in values:
            value = str(value)
            if value.startswith(prefix):
                suffix = value[len(prefix):]
                if suffix.isdigit():
                    next_number = max(next_number, int(suffix) + 1)
            elif not prefix:
                digits = re.findall(r'\d+', value)
                if digits:
                    next_number = max(next_number, int(digits[-1]) + 1)

        def format_candidate(number):
            suffix = f"{number:0{number_width}d}" if number_width else str(number)
            return f"{prefix}{suffix}"

        candidate = format_candidate(next_number)

        def candidate_exists(cand):
            if field_name == "customer_id_no":
                return (
                    Customer.objects.filter(customer_id_no=cand).exclude(pk=exclude_pk).exists()
                    or CustomerProfile.objects.filter(customer_id_no=cand).exists()
                )
            return Customer.objects.filter(**{field_name: cand}).exclude(pk=exclude_pk).exists()

        while candidate_exists(candidate):
            next_number += 1
            candidate = format_candidate(next_number)

        return candidate

    @staticmethod
    def assign_identifiers(customer):
        profile, _ = UserProfile.objects.get_or_create(pk=1)
        
        if not customer.sno or Customer.objects.filter(sno=customer.sno).exclude(pk=customer.pk).exists():
            customer.sno = CustomerService.get_next_number("sno", profile.sno_format, exclude_pk=customer.pk)
            
        if not customer.ano or Customer.objects.filter(ano=customer.ano).exclude(pk=customer.pk).exists():
            customer.ano = CustomerService.get_next_number("ano", profile.ano_format, exclude_pk=customer.pk)
            
        if customer.profile_id:
            customer.customer_id_no = customer.profile.customer_id_no
        elif not customer.customer_id_no or Customer.objects.filter(customer_id_no=customer.customer_id_no).exclude(pk=customer.pk).exists():
            customer.customer_id_no = CustomerService.get_next_number("customer_id_no", profile.customer_id_no_format, exclude_pk=customer.pk)
            
        customer.save(update_fields=["sno", "ano", "customer_id_no", "updated_at"])

    @staticmethod
    def rebuild_loan_schedule(customer):
        """Recalculate a loan and its schedule after a safe, unpaid loan-term edit."""
        principal = Decimal(customer.amount)
        rate = Decimal(customer.interest_rate)
        tenure = int(customer.tenure)
        if tenure < 1:
            raise ValueError("Loan tenure must be at least one month.")

        principal_per_month = (principal / Decimal(tenure)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        opening_principal = principal
        total_interest = Decimal("0.00")
        previous_tenure_date = customer.date
        installment_rows = []

        for month_number in range(1, tenure + 1):
            principal_due = (
                opening_principal
                if month_number == tenure
                else min(principal_per_month, opening_principal)
            )
            monthly_interest = (opening_principal * rate / Decimal("100")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            close_amount = principal_due + monthly_interest
            remaining_principal = max(
                (opening_principal + monthly_interest) - close_amount,
                Decimal("0.00"),
            )
            due_date = CustomerService.tenure_due_date(
                customer, month_number, previous_tenure_date
            )
            total_interest += monthly_interest

            amount_paid = monthly_interest if month_number == 1 else Decimal("0.00")
            total_due = close_amount
            if amount_paid >= total_due:
                installment_status = "Paid"
            elif amount_paid > 0:
                installment_status = "Partially Paid"
            else:
                installment_status = "Pending"
            installment_rows.append(Installment(
                customer=customer,
                month_number=month_number,
                due_date=due_date,
                principal_due=principal_due,
                interest_due=monthly_interest,
                total_due=total_due,
                amount_paid=amount_paid,
                status=installment_status,
                paid_date=customer.date if installment_status == "Paid" else None,
            ))
            opening_principal = remaining_principal
            previous_tenure_date = due_date

        customer.total_interest = total_interest
        customer.total_payable = principal + total_interest
        customer.amount_paid = installment_rows[0].amount_paid
        customer.status = "Active"
        customer.save(update_fields=[
            "total_interest", "total_payable", "amount_paid", "status", "updated_at"
        ])

        customer.installments.all().delete()
        Installment.objects.bulk_create(installment_rows)

        upfront_interest = installment_rows[0].interest_due
        upfront_payment = customer.payments.filter(payment_mode="Upfront Deduction").order_by("id").first()
        if upfront_payment:
            upfront_payment.payment_amount = upfront_interest
            upfront_payment.interest_portion = upfront_interest
            upfront_payment.principal_portion = Decimal("0.00")
            upfront_payment.payment_date = customer.date
            upfront_payment.save(update_fields=[
                "payment_amount", "interest_portion", "principal_portion", "payment_date"
            ])
        else:
            Payment.objects.create(
                customer=customer,
                payment_amount=upfront_interest,
                principal_portion=Decimal("0.00"),
                interest_portion=upfront_interest,
                payment_date=customer.date,
                payment_mode="Upfront Deduction",
                remarks="First month interest deducted at loan disbursement",
            )

    @staticmethod
    def create_transaction_and_jewel(customer, transaction_serializer, jewel_serializer):
        with transaction.atomic():
            interest_amount = (
                transaction_serializer.validated_data["amount"] * Decimal("0.025")
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            customer_transaction = transaction_serializer.save(
                customer=customer,
                interest_amount=interest_amount,
            )
            jewel_serializer.save(transaction=customer_transaction)
            return customer_transaction

class AuthService:
    @staticmethod
    def get_system_user(request_user):
        return request_user

    @staticmethod
    def update_password(user, new_password):
        user.set_password(new_password)
        user.save()

    @staticmethod
    def verify_password(user, password):
        return user.check_password(password)
