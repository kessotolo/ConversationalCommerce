"""
Admin API module for merchant-specific admin endpoints.

This module provides the API structure for merchant admin dashboards
following the pattern: admin.enwhe.io/store/{merchant-id}/

All endpoints are scoped to specific merchants and require proper
authentication and authorization.
"""

from fastapi import APIRouter

from app.app.api.v1.admin.endpoints import (
    dashboard,
    products,
    orders,
    analytics,
    settings,
    team_members,
)

# Main admin API router for merchant-specific endpoints
admin_router = APIRouter(prefix="/admin", tags=["admin"])

# Include all merchant admin routers
admin_router.include_router(
    dashboard.router, prefix="/dashboard", tags=["dashboard"])
admin_router.include_router(
    products.router, prefix="/products", tags=["products"])
admin_router.include_router(orders.router, prefix="/orders", tags=["orders"])
admin_router.include_router(
    analytics.router, prefix="/analytics", tags=["analytics"])
admin_router.include_router(
    settings.router, prefix="/settings", tags=["settings"])
admin_router.include_router(
    team_members.router, prefix="/team", tags=["team-members"])
