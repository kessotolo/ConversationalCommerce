"""
Admin login and session management.

This module provides functions for handling admin user login, logout, and session management.
"""

from datetime import datetime, timedelta
from typing import Dict, Optional, Any
from uuid import UUID

from fastapi import Request, Response, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt

from app.core.config.settings import get_settings
from app.core.security import verify_password
from app.models.admin.admin_user import AdminUser
from app.models.user import User
from app.services.admin.admin_user.service import AdminUserService


async def authenticate_admin_user(
    db: AsyncSession,
    email: str,
    password: str,
    ip_address: Optional[str] = None,
    admin_user_service: Optional[AdminUserService] = None,
) -> Optional[AdminUser]:
    """
    Authenticate an admin user by email and password.

    Args:
        db: Database session
        email: User email
        password: User password
        ip_address: Client IP address
        admin_user_service: Optional admin user service

    Returns:
        The authenticated admin user or None if authentication fails
    """
    # First find the base user by email
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()

    # Verify password if user exists
    if not user or not verify_password(password, user.hashed_password):
        return None

    # Get the admin user
    service = admin_user_service or AdminUserService()
    admin_user = await service.get_admin_user_by_user_id(db, user.id)

    # Return None if no admin user exists or account is inactive
    if not admin_user or not admin_user.is_active:
        return None

    # Verify IP restrictions if applicable
    if ip_address and admin_user.allowed_ip_ranges:
        if not service.is_ip_allowed(ip_address, admin_user.allowed_ip_ranges):
            return None

    # Record login
    await service.record_login(db, admin_user.id, ip_address or "unknown")

    return admin_user


def create_admin_access_token(
    user_id: UUID,
    is_admin: bool = True,
    is_super_admin: bool = False,
    expires_delta: Optional[timedelta] = None,
    ip_address: Optional[str] = None,
    additional_data: Optional[Dict[str, Any]] = None
) -> str:
    """
    Create a JWT access token for admin authentication.

    Args:
        user_id: User ID
        is_admin: Whether the user is an admin
        is_super_admin: Whether the user is a super admin
        expires_delta: Optional expiration time delta
        ip_address: Client IP address
        additional_data: Additional data to include in the token

    Returns:
        JWT token
    """
    # Set token expiration time
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    # Create token data
    token_data = {
        "sub": str(user_id),
        "exp": expire,
        "is_admin": is_admin,
        "is_super_admin": is_super_admin
    }

    # Add IP address if provided
    if ip_address:
        token_data["ip"] = ip_address

    # Add additional data if provided
    if additional_data:
        token_data.update(additional_data)

    # Create and return token
    return jwt.encode(
        token_data,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )


async def get_admin_login_info(
    db: AsyncSession,
    admin_user: AdminUser,
    include_permissions: bool = True,
    admin_user_service: Optional[AdminUserService] = None
) -> Dict[str, Any]:
    """
    Get admin user login information including roles and permissions.

    Args:
        db: Database session
        admin_user: Admin user
        include_permissions: Whether to include permissions
        admin_user_service: Optional admin user service

    Returns:
        Admin user login information
    """
    service = admin_user_service or AdminUserService()

    # Get user roles
    roles_with_tenants = await service.get_admin_user_roles(db, admin_user.id)
    roles = [
        {
            "id": str(role.id),
            "name": role.name,
            "description": role.description,
            "is_system": role.is_system,
            "is_tenant_scoped": role.is_tenant_scoped,
            "tenant_id": str(tenant_id) if tenant_id else None
        }
        for role, tenant_id in roles_with_tenants
    ]

    # Base login info
    login_info = {
        "id": str(admin_user.id),
        "user_id": str(admin_user.user_id),
        "is_super_admin": admin_user.is_super_admin,
        "last_login_at": admin_user.last_login_at.isoformat() if admin_user.last_login_at else None,
        "last_login_ip": admin_user.last_login_ip,
        "roles": roles,
        "preferences": admin_user.preferences or {}
    }

    # Add permissions if requested
    if include_permissions:
        permissions = await service.get_admin_user_permissions(db, admin_user.id)
        login_info["permissions"] = permissions

    return login_info


def get_client_ip(request: Request) -> str:
    """
    Get the client IP address from a request.

    Args:
        request: FastAPI request

    Returns:
        Client IP address
    """
    # Try to get from X-Forwarded-For header first (for proxies)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Get the first IP in the list (client IP)
        return forwarded_for.split(",")[0].strip()

    # Fallback to direct client IP
    return request.client.host if request.client else "unknown"


def require_two_factor_auth(admin_user: AdminUser) -> bool:
    """
    Check if two-factor authentication is required for an admin user.

    Args:
        admin_user: Admin user

    Returns:
        True if 2FA is required, False otherwise
    """
    return admin_user.require_2fa


async def verify_two_factor_auth(
    admin_user: AdminUser,
    token: str
) -> bool:
    """
    Verify two-factor authentication token.

    Args:
        admin_user: Admin user
        token: 2FA token

    Returns:
        True if token is valid, False otherwise
    """
    # This is a placeholder for actual 2FA verification logic
    # In a real implementation, this would verify the token with a library like pyotp

    # For now, just return True for testing
    return True
