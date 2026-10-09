from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("customers", "0008_usermoduleaccess"),
    ]

    operations = [
        migrations.AddField(
            model_name="customer",
            name="tenure_date_overrides",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
