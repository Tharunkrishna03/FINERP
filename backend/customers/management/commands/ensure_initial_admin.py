import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


class Command(BaseCommand):
    help = "Create or update the initial administrator from environment variables."

    @transaction.atomic
    def handle(self, *args, **options):
        username = os.environ.get("INITIAL_ADMIN_USERNAME", "").strip()
        password = os.environ.get("INITIAL_ADMIN_PASSWORD", "")
        if not username or not password:
            raise CommandError(
                "Set INITIAL_ADMIN_USERNAME and INITIAL_ADMIN_PASSWORD before running this command."
            )

        User = get_user_model()
        user, created = User.objects.get_or_create(username=username)
        user.set_password(password)
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        user.save(update_fields=["password", "is_active", "is_staff", "is_superuser"])

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} administrator account '{username}'."))
