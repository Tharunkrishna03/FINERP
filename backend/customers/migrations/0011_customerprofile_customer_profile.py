from django.db import migrations, models
import django.db.models.deletion


def attach_existing_customers(apps, schema_editor):
    Customer = apps.get_model("customers", "Customer")
    CustomerProfile = apps.get_model("customers", "CustomerProfile")
    db = schema_editor.connection.alias
    profiles_by_key = {}

    for customer in Customer.objects.using(db).order_by("pk").iterator():
        customer_id = (customer.customer_id_no or "").strip().casefold()
        phone = "".join(character for character in (customer.phone or "") if character.isdigit())
        name = (customer.customer_name or "").strip().casefold()
        key = ("id", customer_id) if customer_id else ("phone-name", phone, name)
        profile = profiles_by_key.get(key)
        if profile is None:
            profile = CustomerProfile.objects.using(db).create(
                customer_name=customer.customer_name,
                guardian_name=customer.guardian_name,
                phone=customer.phone,
                customer_id_no=customer.customer_id_no,
                address=customer.address,
            )
            profiles_by_key[key] = profile
        Customer.objects.using(db).filter(pk=customer.pk).update(profile_id=profile.pk)


class Migration(migrations.Migration):

    dependencies = [
        ("customers", "0010_customer_tenure_call_done"),
    ]

    operations = [
        migrations.CreateModel(
            name="CustomerProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("customer_name", models.CharField(max_length=255)),
                ("guardian_name", models.CharField(max_length=255)),
                ("phone", models.CharField(max_length=20)),
                ("customer_id_no", models.CharField(blank=True, max_length=100, null=True)),
                ("address", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.AddField(
            model_name="customer",
            name="profile",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="accounts", to="customers.customerprofile"),
        ),
        migrations.RunPython(attach_existing_customers, migrations.RunPython.noop),
    ]
