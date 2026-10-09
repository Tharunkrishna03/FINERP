from django.db import DatabaseError, connection
from django.http import JsonResponse


def health_check(request):
    """Public service probe that also verifies the configured database."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except DatabaseError:
        return JsonResponse({"status": "unavailable"}, status=503)

    response = JsonResponse({"status": "ok"})
    response["Cache-Control"] = "no-store"
    return response
