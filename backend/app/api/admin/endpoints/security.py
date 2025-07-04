"""
Security enhancement endpoints for admin users.

This module provides endpoints for:
- Two-Factor Authentication (2FA) management
- IP allowlisting
- Rate limiting configuration
- Emergency controls
"""

import uuid
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field, validator

from app.api.deps import get_db
from app.services.security.two_factor_service import TwoFactorService
from app.services.admin.auth.dependencies import get_current_admin_user
from app.models.admin.admin_user import AdminUser


router = APIRouter(prefix="/security", tags=["security"])
two_factor_service = TwoFactorService()


# --- 2FA Schemas ---

class TOTPSetupResponse(BaseModel):
    """Response schema for TOTP setup."""
    secret: str
    qr_code_uri: str
    backup_codes: List[str]
    totp_record_id: uuid.UUID


class TOTPVerifyRequest(BaseModel):
    """Request schema for TOTP verification."""
    code: str = Field(..., min_length=6, max_length=6, regex=r"^\d{6}$")


class BackupCodeVerifyRequest(BaseModel):
    """Request schema for backup code verification."""
    code: str = Field(..., min_length=10, max_length=10, regex=r"^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{10}$")


class TOTPRequirementRequest(BaseModel):
    """Request schema for setting 2FA requirements."""
    is_required: bool
    role_id: Optional[uuid.UUID] = None
    tenant_id: Optional[uuid.UUID] = None
    grace_period_days: int = Field(7, ge=0, le=90)
    
    @validator('role_id', 'tenant_id', pre=True)
    def validate_ids(cls, value):
        """Validate that at least one of role_id or tenant_id is provided or both are None."""
        return value


class BackupCodesResponse(BaseModel):
    """Response schema for backup codes."""
    backup_codes: List[str]


# --- 2FA Endpoints ---

@router.post("/totp/setup", response_model=TOTPSetupResponse)
async def setup_totp(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user)
):
    """
    Set up Two-Factor Authentication (2FA) using TOTP.
    
    Returns the secret key, QR code URI for scanning, and backup codes.
    """
    try:
        # Extract IP and user agent
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("User-Agent")
        
        result = await two_factor_service.setup_totp(
            db=db,
            user_id=current_user.id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/totp/verify", status_code=status.HTTP_200_OK)
async def verify_totp(
    request: TOTPVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user)
):
    """
    Verify a TOTP code.
    
    Returns a 200 OK if the code is valid, 400 Bad Request otherwise.
    """
    is_valid = await two_factor_service.verify_totp(
        db=db,
        user_id=current_user.id,
        code=request.code
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid TOTP code"
        )
    
    return {"status": "verified"}


@router.post("/totp/backup-code", status_code=status.HTTP_200_OK)
async def verify_backup_code(
    request: BackupCodeVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user)
):
    """
    Verify a backup code.
    
    Returns a 200 OK if the code is valid, 400 Bad Request otherwise.
    """
    is_valid = await two_factor_service.verify_backup_code(
        db=db,
        user_id=current_user.id,
        code=request.code
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid backup code"
        )
    
    return {"status": "verified"}


@router.post("/totp/disable", status_code=status.HTTP_200_OK)
async def disable_totp(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user)
):
    """
    Disable 2FA for the current user.
    """
    # Check if the current user is required to have 2FA
    is_required = await two_factor_service.is_totp_required(db, current_user)
    
    if is_required:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="2FA is required for your role and cannot be disabled"
        )
    
    success = await two_factor_service.disable_totp(
        db=db,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to disable 2FA or 2FA is not enabled"
        )
    
    return {"status": "disabled"}


@router.post("/totp/reset-backup-codes", response_model=BackupCodesResponse)
async def reset_backup_codes(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user)
):
    """
    Reset backup codes for the current user.
    """
    backup_codes = await two_factor_service.reset_backup_codes(
        db=db,
        user_id=current_user.id
    )
    
    if not backup_codes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to reset backup codes or 2FA is not set up"
        )
    
    return {"backup_codes": backup_codes}


@router.get("/totp/status", status_code=status.HTTP_200_OK)
async def get_totp_status(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user)
):
    """
    Get the 2FA status for the current user.
    """
    is_enabled = await two_factor_service.is_totp_enabled(db, current_user.id)
    is_required = await two_factor_service.is_totp_required(db, current_user)
    
    return {
        "is_enabled": is_enabled,
        "is_required": is_required
    }


# --- Admin 2FA Management ---

@router.post("/totp/requirement", status_code=status.HTTP_201_CREATED)
async def set_totp_requirement(
    request: TOTPRequirementRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user)
):
    """
    Set a 2FA requirement for a role, tenant, or globally.
    
    Requires super admin permission.
    """
    # Check if the user is a super admin
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can set 2FA requirements"
        )
    
    requirement = await two_factor_service.set_requirement(
        db=db,
        is_required=request.is_required,
        role_id=request.role_id,
        tenant_id=request.tenant_id,
        grace_period_days=request.grace_period_days,
        admin_user_id=current_user.id
    )
    
    return {
        "id": requirement.id,
        "is_required": requirement.is_required,
        "role_id": requirement.role_id,
        "tenant_id": requirement.tenant_id,
        "grace_period_days": requirement.grace_period_days,
        "created_at": requirement.created_at,
        "updated_at": requirement.updated_at
    }


@router.post("/totp/disable/{user_id}", status_code=status.HTTP_200_OK)
async def admin_disable_totp(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user)
):
    """
    Disable 2FA for a specific user.
    
    Requires super admin permission.
    """
    # Check if the user is a super admin
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can disable 2FA for other users"
        )
    
    success = await two_factor_service.disable_totp(
        db=db,
        user_id=user_id,
        admin_user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to disable 2FA or 2FA is not enabled"
        )
    
    return {"status": "disabled"}
