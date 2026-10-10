import customers.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("customers", "0012_useravatar"),
    ]

    operations = [
        migrations.AddField(
            model_name="usermoduleaccess",
            name="role",
            field=models.CharField(blank=True, default="Staff", max_length=50),
        ),
        migrations.AlterField(
            model_name="useravatar",
            name="image",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to=customers.models.user_avatar_upload_path,
            ),
        ),
    ]
