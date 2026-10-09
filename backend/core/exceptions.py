from rest_framework.views import exception_handler
from rest_framework.response import Response

def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    # Now add the custom formatting.
    if response is not None:
        custom_data = {
            "success": False,
            "message": "Unable to complete the operation",
            "error": {
                "code": exc.__class__.__name__,
                "details": response.data
            }
        }
        response.data = custom_data

    return response
