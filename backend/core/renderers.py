from rest_framework.renderers import JSONRenderer

class ERPJSONRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        # If it's already structured by our custom exception handler, just render it
        if isinstance(data, dict) and data.get("success") is False and "error" in data:
            return super().render(data, accepted_media_type, renderer_context)

        # Standardizing success response
        response_data = {
            "success": True,
            "message": "Operation completed successfully",
            "data": data
        }
        
        # If the view already wrapped it (e.g., custom message), handle conditionally
        if isinstance(data, dict) and "message" in data and "data" not in data and "success" not in data:
            # We assume it's just raw data that happened to have a "message" key
            pass

        return super().render(response_data, accepted_media_type, renderer_context)
