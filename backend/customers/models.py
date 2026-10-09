from django.conf import settings
from django.db import models


USER_MODULE_CHOICES = (
    ("dashboard", "Dashboard"),
    ("customers", "Customers"),
    ("transactions", "Transactions"),
    ("collections", "Collections"),
    ("settings", "Settings"),
)
USER_MODULE_KEYS = tuple(key for key, _label in USER_MODULE_CHOICES)

class CustomerProfile(models.Model):
    """Identity and contact details shared by a customer's loan accounts."""
    id = models.BigAutoField(primary_key=True)
    customer_name = models.CharField(max_length=255)
    guardian_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    customer_id_no = models.CharField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.customer_name

class Customer(models.Model):
    profile = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name="accounts",
        null=True,
        blank=True,
    )
    sno = models.CharField(max_length=50, blank=True, null=True)
    ano = models.CharField(max_length=50, blank=True, null=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    customer_name = models.CharField(max_length=255)
    guardian_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    customer_id_no = models.CharField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    
    item_type = models.CharField(max_length=100)
    metal_type = models.CharField(max_length=255) # Can store comma-separated list
    purity = models.CharField(max_length=50)
    weight = models.DecimalField(max_digits=10, decimal_places=2)
    num_stones = models.IntegerField(default=0)
    remark = models.TextField(blank=True, null=True)
    
    photo = models.ImageField(upload_to='customer_photos/', blank=True, null=True)
    
    # Financial fields
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=2.5)
    tenure = models.PositiveIntegerField(default=12)
    total_interest = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_payable = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tenure_date_overrides = models.JSONField(default=dict, blank=True)
    tenure_call_done = models.BooleanField(default=False)
    status = models.CharField(max_length=50, default='Active')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.customer_name

class Installment(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='installments')
    month_number = models.PositiveIntegerField()
    due_date = models.DateField()
    principal_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    interest_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=50, default='Pending') # Pending, Partially Paid, Paid, Overdue
    paid_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Installment {self.month_number} for {self.customer.customer_name}"

class Payment(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='payments')
    installment = models.ForeignKey(Installment, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    payment_amount = models.DecimalField(max_digits=12, decimal_places=2)
    principal_portion = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    interest_portion = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_date = models.DateField()
    payment_mode = models.CharField(max_length=50, default='Cash')
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    created_by = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.id} for {self.customer.customer_name}"



class CustomerTransaction(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    interest_amount = models.DecimalField(max_digits=12, decimal_places=2)
    tenure = models.PositiveIntegerField(default=12)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Transaction {self.pk} for {self.customer}"


class JewelDetail(models.Model):
    transaction = models.OneToOneField(CustomerTransaction, on_delete=models.CASCADE, related_name='jewel')
    item_type = models.CharField(max_length=100)
    metal_type = models.CharField(max_length=255)
    purity = models.CharField(max_length=50)
    weight = models.DecimalField(max_digits=10, decimal_places=2)
    num_stones = models.IntegerField(default=0)
    photo = models.ImageField(upload_to='jewel_photos/', blank=True, null=True)
    remark = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.item_type


class UserProfile(models.Model):
    user_name = models.CharField(max_length=255, default="John Doe")
    role = models.CharField(max_length=100, default="Administrator")
    profile_image = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    
    sno_format = models.CharField(max_length=50, default="1")
    ano_format = models.CharField(max_length=50, default="1")
    customer_id_no_format = models.CharField(max_length=50, default="1")

    def __str__(self):
        return self.user_name


class UserModuleAccess(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="module_access",
    )
    visible_modules = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"Module visibility for {self.user.username}"
