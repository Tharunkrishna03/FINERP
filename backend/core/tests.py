import json
from unittest.mock import Mock, patch

from django.db import OperationalError
from django.test import RequestFactory, SimpleTestCase

from .views import health_check


class HealthCheckTests(SimpleTestCase):
    def test_database_failure_is_logged_and_not_returned_to_the_client(self):
        request = RequestFactory().get("/healthz/")
        database = Mock()
        database.cursor.side_effect = OperationalError("sensitive connection details")

        with (
            patch(
                "core.views.connection",
                database,
            ),
            self.assertLogs("core.views", level="ERROR") as captured_logs,
        ):
            response = health_check(request)

        self.assertEqual(response.status_code, 503)
        self.assertEqual(json.loads(response.content), {"status": "unavailable"})
        self.assertNotIn("sensitive connection details", response.content.decode())
        self.assertIn("Database health check failed", captured_logs.output[0])
