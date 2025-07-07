"""
Main admin API router for the unified super admin dashboard.
Includes all dashboard, RBAC, search, and activity feed endpoints.
"""

from fastapi import APIRouter
from app.api.admin.endpoints import (
    dashboard,
    rbac,
    global_search,
    activity_feed,
    security_dashboard
)

router = APIRouter()

# Include all admin dashboard routers
router.include_router(
    dashboard.router, prefix="/dashboard", tags=["dashboard"])
router.include_router(rbac.router, prefix="/rbac", tags=["rbac"])
router.include_router(global_search.router, prefix="/search", tags=["search"])
router.include_router(activity_feed.router,
                      prefix="/activity", tags=["activity"])
router.include_router(security_dashboard.router,
                      prefix="/security", tags=["security"])
