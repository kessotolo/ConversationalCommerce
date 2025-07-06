"""
Admin API router.

This module provides the main admin router that includes all admin-specific endpoints.
"""

from fastapi import APIRouter

from app.api.routes.admin.auth import router as auth_router
from app.api.admin.endpoints.super_admin_security import router as super_admin_security_router

# Main admin API router
admin_router = APIRouter(prefix="/api/admin")

# Include admin-specific routers
admin_router.include_router(auth_router)
admin_router.include_router(super_admin_security_router)

# Future admin routers will be included here:
# admin_router.include_router(roles_router)
# admin_router.include_router(users_router)
# admin_router.include_router(tenants_router)
# etc.
