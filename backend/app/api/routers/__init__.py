# Import routers here as needed
# Note: customer router is in app.api.v1.endpoints.customer

from .admin import router as admin_router

__all__ = ["admin_router"]
