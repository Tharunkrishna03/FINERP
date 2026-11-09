import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def migrate_profile_role_and_owner(apps, schema_editor):
    UserProfile = apps.get_model("customers", "UserProfile")
    Role = apps.get_model("customers", "Role")
    user_app, user_model = settings.AUTH_USER_MODEL.split(".")
    User = apps.get_model(user_app, user_model)
    database = schema_editor.connection.alias

    for profile in UserProfile.objects.using(database).all().iterator():
        role_name = (profile.role or "").strip()
        if role_name:
            role, _ = Role.objects.using(database).get_or_create(name=role_name)
            profile.role_relation_id = role.pk
            profile.save(update_fields=["role_relation"])

    orphaned_profile = (
        UserProfile.objects.using(database)
        .filter(user__isnull=True)
        .order_by("pk")
        .first()
    )
    if orphaned_profile:
        owner = (
            User.objects.using(database)
            .filter(is_superuser=True)
            .order_by("pk")
            .first()
            or User.objects.using(database).order_by("pk").first()
        )
        if owner:
            orphaned_profile.user_id = owner.pk
            orphaned_profile.save(update_fields=["user"])


class Migration(migrations.Migration):
    dependencies = [
        ("customers", "0013_usermoduleaccess_role_and_avatar_path"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Role",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("name", models.CharField(max_length=100, unique=True)),
            ],
        ),
        migrations.AddField(
            model_name="userprofile",
            name="role_relation",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="profiles",
                to="customers.role",
            ),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="user",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="profile",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(migrate_profile_role_and_owner, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="userprofile",
            name="role",
        ),
        migrations.RenameField(
            model_name="userprofile",
            old_name="role_relation",
            new_name="role",
        ),
    ]
