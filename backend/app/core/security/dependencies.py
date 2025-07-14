"""
Authentication dependencies with multi-organization Clerk support.

This module provides authentication dependencies that integrate with:
- Multiple Clerk Organizations (seller and admin)
- Advanced session management with idle timeout
- Domain-specific authentication
"""

import os
from typing import Optional
from fastapi import Depends, HTTPException, status, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.app.db.deps import get_db
from app.app.core.security.clerk_multi_org import MultiOrgClerkTokenData, clerk_service
from app.app.core.security.auth_deps import require_auth
from app.app.services.admin.admin_service import AdminService

# Helper: is test mode?
IS_TEST_MODE = os.getenv("TESTING", "").lower() in (
    "true", "1", "t", "yes", "y")


async def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> MultiOrgClerkTokenData:
    """
    Get current authenticated user from JWT token.
    Validates token and returns user data with roles.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required"
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token required"
        )

    token = authorization.replace("Bearer ", "")

    try:
        return clerk_service.verify_token(token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


async def get_current_admin(
    current_user: MultiOrgClerkTokenData = Depends(get_current_user)
) -> MultiOrgClerkTokenData:
    """
    Get current authenticated admin user.
    Validates admin role and organization.
    """
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def get_current_super_admin(
    request: Request = None,
    current_admin: MultiOrgClerkTokenData = Depends(get_current_admin)
) -> MultiOrgClerkTokenData:
    """
    Get current authenticated super admin user.
    Validates super admin role and organization.
    """
    if not current_admin.is_super_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return current_admin


async def get_current_seller(
    current_user: MultiOrgClerkTokenData = Depends(get_current_user)
) -> MultiOrgClerkTokenData:
    """
    Get current authenticated seller user.
    Validates seller role and organization.
    """
    if not current_user.is_seller():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller access required"
        )
    return current_user


async def get_current_admin_or_seller(
    current_user: MultiOrgClerkTokenData = Depends(get_current_user)
) -> MultiOrgClerkTokenData:
    """
    Get current authenticated user that is either an admin or seller.
    Allows both seller and admin tokens for general admin endpoints.
    """
    if not (current_user.is_admin() or current_user.is_seller()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or seller access required"
        )
    return current_user


async def get_current_admin_user(
    current_admin: MultiOrgClerkTokenData = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Get current admin user with database validation.
    Returns admin user data from database.
    """
    admin_service = AdminService()

    # Get admin user from database
    admin_user = await admin_service.get_admin_user_by_clerk_id(
        db, current_admin.user_id
    )

    if not admin_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin user not found in database"
        )

    return admin_user


async def get_current_super_admin_user(
    current_super_admin: MultiOrgClerkTokenData = Depends(
        get_current_super_admin),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Get current super admin user with database validation.
    Returns super admin user data from database.
    """
    admin_service = AdminService()

    # Get super admin user from database
    super_admin_user = await admin_service.get_super_admin_user_by_clerk_id(
        db, current_super_admin.user_id
    )

    if not super_admin_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Super admin user not found in database"
        )

    return super_admin_user
