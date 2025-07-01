"""
Admin authentication API routes.

This module provides API endpoints for admin user authentication and session management.
"""

from typing import Dict, Any, Optional
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.admin.admin_user import AdminUser
from app.services.admin.admin_user.service import AdminUserService
from app.services.admin.auth.session import (
    authenticate_admin_user,
    create_admin_access_token,
    get_admin_login_info,
    get_client_ip,
    require_two_factor_auth,
    verify_two_factor_auth,
)
from app.services.admin.auth.dependencies import (
    get_current_admin_user,
    get_current_super_admin,
)
from app.core.config import settings


router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])


@router.post("/token", response_model=Dict[str, Any])
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint to authenticate admin users and issue access tokens.
    
    This endpoint handles the initial login and two-factor authentication if needed.
    """
    # Get client IP address
    ip_address = get_client_ip(request)
    
    # Authenticate user
    admin_user = await authenticate_admin_user(
        db=db,
        email=form_data.username,  # OAuth2 form uses 'username' field for email
        password=form_data.password,
        ip_address=ip_address
    )
    
    # Handle authentication failure
    if not admin_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if 2FA is required
    needs_2fa = require_two_factor_auth(admin_user)
    
    # Create token with appropriate expiration
    access_token = create_admin_access_token(
        user_id=admin_user.user_id,
        is_admin=True,
        is_super_admin=admin_user.is_super_admin,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        ip_address=ip_address,
        # If 2FA is required, mark token as requiring 2FA
        additional_data={"needs_2fa": needs_2fa} if needs_2fa else None
    )
    
    # Return token and login info
    login_info = await get_admin_login_info(
        db=db,
        admin_user=admin_user,
        # Only include permissions after 2FA if required
        include_permissions=not needs_2fa
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin_user": login_info,
        "needs_two_factor_auth": needs_2fa
    }


@router.post("/two-factor", response_model=Dict[str, Any])
async def verify_two_factor(
    request: Request,
    token_data: Dict[str, str] = Body(...),
    admin_user: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint to verify two-factor authentication after initial login.
    """
    # Extract 2FA token from request body
    two_factor_token = token_data.get("token")
    if not two_factor_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor authentication token is required"
        )
    
    # Verify 2FA token
    is_valid = await verify_two_factor_auth(admin_user, two_factor_token)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid two-factor authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get client IP address
    ip_address = get_client_ip(request)
    
    # Create a new token without 2FA requirement
    access_token = create_admin_access_token(
        user_id=admin_user.user_id,
        is_admin=True,
        is_super_admin=admin_user.is_super_admin,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        ip_address=ip_address
    )
    
    # Return token and complete login info with permissions
    login_info = await get_admin_login_info(
        db=db,
        admin_user=admin_user,
        include_permissions=True
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin_user": login_info
    }


@router.get("/me", response_model=Dict[str, Any])
async def read_admin_users_me(
    admin_user: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint to get the currently logged in admin user's information.
    """
    login_info = await get_admin_login_info(
        db=db,
        admin_user=admin_user,
        include_permissions=True
    )
    
    return {"admin_user": login_info}


@router.post("/refresh", response_model=Dict[str, Any])
async def refresh_token(
    request: Request,
    admin_user: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint to refresh the admin user's access token.
    """
    # Get client IP address
    ip_address = get_client_ip(request)
    
    # Create a new token
    access_token = create_admin_access_token(
        user_id=admin_user.user_id,
        is_admin=True,
        is_super_admin=admin_user.is_super_admin,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        ip_address=ip_address
    )
    
    # Return new token
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/logout", response_model=Dict[str, Any])
async def logout(
    admin_user: AdminUser = Depends(get_current_admin_user)
):
    """
    Endpoint to log out an admin user.
    
    This endpoint doesn't actually invalidate the token (stateless auth),
    but client should discard the token after calling this.
    """
    return {"message": "Successfully logged out"}
