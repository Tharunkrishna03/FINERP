import logging

from django.db import DatabaseError, connection
from django.http import JsonResponse


logger = logging.getLogger(__name__)


def health_check(request):
    """Public service probe that also verifies the configured database."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except DatabaseError:
        logger.exception("Database health check failed")
        return JsonResponse({"status": "unavailable"}, status=503)

    response = JsonResponse({"status": "ok"})
    response["Cache-Control"] = "no-store"
    return response
