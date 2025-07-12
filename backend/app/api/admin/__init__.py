"""
Main admin API router for the unified super admin dashboard.
Includes all dashboard, RBAC, search, and activity feed endpoints.
"""

from fastapi import APIRouter
from backend.app.api.admin.endpoints import (
    dashboard,
    rbac,
    global_search,
    activity_feed,
)

router = APIRouter()

# Include all admin dashboard routers
router.include_router(
    dashboard.router, prefix="/dashboard", tags=["dashboard"])
router.include_router(rbac.router, prefix="/rbac", tags=["rbac"])
router.include_router(global_search.router, prefix="/search", tags=["search"])
router.include_router(activity_feed.router,
                      prefix="/activity", tags=["activity"])

# Include security dashboard router with proper error handling
try:
    from backend.app.api.admin.endpoints import security_dashboard
    router.include_router(security_dashboard.router,
                          prefix="/security", tags=["security"])
except ImportError as e:
    # Log the error but don't fail the entire router
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Security dashboard router not available: {e}")
except Exception as e:
    # Handle other initialization errors (e.g., missing environment variables)
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Security dashboard router initialization failed: {e}")
