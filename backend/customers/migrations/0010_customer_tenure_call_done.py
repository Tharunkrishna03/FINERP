from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("customers", "0009_customer_tenure_date_overrides"),
    ]

    operations = [
        migrations.AddField(
            model_name="customer",
            name="tenure_call_done",
            field=models.BooleanField(default=False),
        ),
    ]
