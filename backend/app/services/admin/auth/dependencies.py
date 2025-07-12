"""
FastAPI dependencies for admin authentication.

This module provides FastAPI dependencies for authenticating admin users.
"""

from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt

from backend.app.models.admin.admin_user import AdminUser
from backend.app.services.admin.admin_user.service import AdminUserService
from backend.app.services.admin.admin_user.auth import verify_admin_access
from backend.app.core.security.password import get_password_hash, verify_password
from backend.app.core.config.settings import get_settings
from backend.app.db.session import get_db


# OAuth2 scheme for admin routes
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/admin/auth/token",
    scheme_name="Admin JWT"
)


async def admin_user_from_token(
    db: AsyncSession,
    token: str,
    admin_user_service: Optional[AdminUserService] = None
) -> AdminUser:
    """
    Get admin user from JWT token.

    Args:
        db: Database session
        token: JWT token
        admin_user_service: Optional admin user service

    Returns:
        The admin user

    Raises:
        HTTPException: If authentication fails
    """
    try:
        # Decode JWT token
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        # Extract user_id from token
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Extract admin flag from token
        is_admin: bool = payload.get("is_admin", False)
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Extract IP address if available
        ip_address: Optional[str] = payload.get("ip")

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get admin user service
    service = admin_user_service or AdminUserService()

    # Get admin user
    admin_user = await service.get_admin_user_by_user_id(
        db=db,
        user_id=UUID(user_id)
    )
    if admin_user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not an admin",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify admin access (active account, IP restrictions, etc.)
    has_access = await verify_admin_access(
        db=db,
        admin_user=admin_user,
        ip_address=ip_address,
        # 2FA verification would be handled separately
        require_2fa=False
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access denied",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Enforce staff-only access for admin endpoints
    # Require the user to have the 'staff' role (platform-wide, not tenant-scoped)
    has_staff_role = await service.has_role(
        db=db,
        admin_user_id=admin_user.id,
        role_name="staff",
        tenant_id=None,  # Platform-wide role
        include_ancestors=True
    )
    if not has_staff_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff role required for admin access",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return admin_user


async def get_current_admin_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> AdminUser:
    """
    FastAPI dependency to get the current admin user from JWT token.

    Args:
        token: JWT token from OAuth2 scheme
        db: Database session

    Returns:
        The current admin user
    """
    return await admin_user_from_token(db, token)


async def get_current_super_admin(
    admin_user: AdminUser = Depends(get_current_admin_user)
) -> AdminUser:
    """
    FastAPI dependency to verify the current admin user is a super admin.

    Args:
        admin_user: Current admin user

    Returns:
        The current admin user if they're a super admin

    Raises:
        HTTPException: If the user is not a super admin
    """
    if not admin_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return admin_user
