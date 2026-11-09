from django.db import migrations


def backfill_user_avatars(apps, schema_editor):
    UserProfile = apps.get_model("customers", "UserProfile")
    UserAvatar = apps.get_model("customers", "UserAvatar")
    database = schema_editor.connection.alias

    legacy_images = (
        UserProfile.objects.using(database)
        .exclude(user_id=None)
        .exclude(profile_image="")
        .values_list("user_id", "profile_image")
        .iterator()
    )

    for user_id, image_name in legacy_images:
        if not image_name:
            continue
        avatar, _ = UserAvatar.objects.using(database).get_or_create(user_id=user_id)
        if not avatar.image:
            UserAvatar.objects.using(database).filter(pk=avatar.pk).update(image=image_name)


class Migration(migrations.Migration):
    dependencies = [
        ("customers", "0014_userprofile_user_and_role"),
    ]

    operations = [
        migrations.RunPython(backfill_user_avatars, migrations.RunPython.noop),
    ]
