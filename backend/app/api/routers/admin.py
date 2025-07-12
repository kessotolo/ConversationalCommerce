"""
Admin API router with multi-organization authentication support.

This router handles admin-specific endpoints with proper authentication
for both seller and admin Clerk organizations.
"""

import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.db.session import get_db
from backend.app.core.security.dependencies import (
    get_current_admin,
    get_current_super_admin,
    get_current_admin_user,
    get_current_seller,
    get_current_admin_or_seller,
    get_current_super_admin_user,
)
from backend.app.core.security.clerk_multi_org import MultiOrgClerkTokenData
from backend.app.core.security.role_based_auth import require_role, require_any_role, require_all_roles
from backend.app.models.admin.admin_user import AdminUser
from backend.app.schemas.admin.admin_user import AdminUserResponse
from backend.app.services.admin.admin_service import AdminService

router = APIRouter(tags=["admin"])


@router.get("/me", response_model=AdminUserResponse)
async def get_current_admin_info(
    current_admin: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current admin user information.

    This endpoint works for both seller admins and super admins.
    """
    try:
        admin_service = AdminService()

        if current_admin.is_super_admin():
            # For super admins, get the AdminUser record
            admin_user = await get_current_admin_user(current_admin=current_admin, db=db)
            return AdminUserResponse.from_orm(admin_user)
        else:
            # For seller admins, return basic info
            return AdminUserResponse(
                id=current_admin.user_id,
                email=current_admin.email,
                is_super_admin=False,
                is_active=True,
                roles=current_admin.roles,
                organization_source=current_admin.organization_source
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get admin info: {str(e)}"
        )


@router.get("/super-admin/me", response_model=AdminUserResponse)
async def get_super_admin_info(
    current_super_admin: MultiOrgClerkTokenData = Depends(
        get_current_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current super admin user information.

    This endpoint is specifically for super admins from the admin organization.
    """
    try:
        admin_user = await get_current_super_admin_user(current_super_admin=current_super_admin, db=db)
        return AdminUserResponse.from_orm(admin_user)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get super admin info: {str(e)}"
        )


@router.get("/seller/me")
async def get_seller_admin_info(
    current_seller: MultiOrgClerkTokenData = Depends(get_current_seller)
):
    """
    Get current seller admin information.

    This endpoint is for seller admins from the seller organization.
    """
    if not current_seller.is_seller():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller access required"
        )

    return {
        "id": current_seller.user_id,
        "email": current_seller.email,
        "roles": current_seller.roles,
        "organization_source": current_seller.organization_source,
        "metadata": current_seller.metadata
    }


@router.post("/logout")
async def logout_admin(
    current_admin: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller)
):
    """
    Logout current admin user.

    This works for both seller admins and super admins.
    """
    return {
        "message": "Successfully logged out",
        "user_id": current_admin.user_id,
        "organization_source": current_admin.organization_source
    }


# Role-based endpoints
@router.get("/admin-only")
async def admin_only_endpoint(
    current_admin: MultiOrgClerkTokenData = Depends(get_current_admin)
):
    """Endpoint that requires admin role from either organization."""
    if not current_admin.has_role("admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required"
        )

    return {
        "message": "Admin access granted",
        "user_id": current_admin.user_id,
        "organization_source": current_admin.organization_source
    }


@router.get("/super-admin-only")
async def super_admin_only_endpoint(
    current_super_admin: MultiOrgClerkTokenData = Depends(
        get_current_super_admin)
):
    """Endpoint that requires super_admin role (admin organization only)."""
    return {
        "message": "Super admin access granted",
        "user_id": current_super_admin.user_id,
        "organization_source": current_super_admin.organization_source
    }


@router.get("/any-admin")
async def any_admin_endpoint(
    current_admin: MultiOrgClerkTokenData = Depends(get_current_admin)
):
    """Endpoint that requires any admin role."""
    if not current_admin.has_any_role(["admin", "super_admin"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required"
        )

    return {
        "message": "Admin access granted",
        "user_id": current_admin.user_id,
        "organization_source": current_admin.organization_source,
        "roles": current_admin.roles
    }


@router.get("/seller-admin")
async def seller_admin_endpoint(
    current_seller: MultiOrgClerkTokenData = Depends(get_current_seller)
):
    """Endpoint that requires seller role."""
    return {
        "message": "Seller admin access granted",
        "user_id": current_seller.user_id,
        "organization_source": current_seller.organization_source
    }
