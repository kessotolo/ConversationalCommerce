"""
Super Admin Security endpoints.

This module provides comprehensive security management endpoints for Super Admins:
- Two-Factor Authentication (2FA) management
- IP allowlist management
- Emergency controls and lockouts
- Security audit logs
- Rate limiting configuration
"""

import uuid
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field, validator

from app.app.api.deps import get_db
from app.app.services.security.super_admin_two_factor_service import super_admin_2fa_service
from app.app.services.security.ip_allowlist_service import IPAllowlistService
from app.app.core.security.dependencies import get_current_super_admin, get_current_admin_user
from app.app.core.security.clerk_multi_org import MultiOrgClerkTokenData as ClerkTokenData
from app.app.core.security.clerk_organizations import clerk_organizations_service
from app.app.models.admin.admin_user import AdminUser


router = APIRouter(prefix="/super-admin/security",
                   tags=["super-admin-security"])
ip_allowlist_service = IPAllowlistService()


# --- Schemas ---

class SuperAdminTOTPSetupResponse(BaseModel):
    """Response schema for Super Admin TOTP setup."""
    secret: str
    qr_code_uri: str
    backup_codes: List[str]
    totp_record_id: str


class SuperAdminTOTPVerifyRequest(BaseModel):
    """Request schema for Super Admin TOTP verification."""
    code: str = Field(..., min_length=6, max_length=6,
                      description="6-digit TOTP code")


class SuperAdminTOTPRequirementRequest(BaseModel):
    """Request schema for setting Super Admin 2FA requirements."""
    is_required: bool
    role_id: Optional[str] = None
    tenant_id: Optional[str] = None
    grace_period_days: int = Field(7, ge=0, le=90)


class SuperAdminIPAllowlistRequest(BaseModel):
    """Request schema for Super Admin IP allowlist entries."""
    ip_range: str = Field(..., description="IP address or CIDR range")
    description: Optional[str] = None
    expires_at: Optional[str] = None

    @validator('ip_range')
    def validate_ip_range(cls, v):
        """Validate IP range format."""
        import ipaddress
        try:
            ipaddress.ip_network(v, strict=False)
            return v
        except ValueError:
            raise ValueError("Invalid IP range format")


class EmergencyLockoutRequest(BaseModel):
    """Request schema for emergency system lockout."""
    reason: str = Field(..., min_length=10, max_length=255)
    message: str = Field(..., min_length=10, max_length=500)
    duration_hours: Optional[int] = Field(None, ge=1, le=168)  # Max 1 week
    allow_read_only: bool = False


class SuperAdminInviteRequest(BaseModel):
    """Request schema for inviting new SuperAdmin users."""
    email: str = Field(..., description="Email address to invite")
    role: str = Field("admin", description="Role to assign (admin, member)")


class SuperAdminManagementResponse(BaseModel):
    """Response schema for SuperAdmin management operations."""
    id: str
    email: str
    role: str
    status: str
    invited_at: Optional[str] = None
    joined_at: Optional[str] = None


# --- SuperAdmin Management Endpoints ---

@router.get("/team/members")
async def get_super_admin_team(
    current_admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all SuperAdmin team members.
    """
    try:
        members = await clerk_organizations_service.get_organization_members()

        return {
            "members": [
                {
                    "id": member.get("public_user_data", {}).get("user_id"),
                    "email": member.get("public_user_data", {}).get("identifier"),
                    "role": member.get("role"),
                    "status": member.get("status"),
                    "created_at": member.get("created_at"),
                    "updated_at": member.get("updated_at")
                }
                for member in members
            ]
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get team members: {str(e)}"
        )


@router.post("/team/invite", status_code=status.HTTP_201_CREATED)
async def invite_super_admin(
    request: SuperAdminInviteRequest,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Invite a new SuperAdmin to the team.
    """
    try:
        invitation = await clerk_organizations_service.invite_super_admin(
            email=request.email,
            role=request.role
        )

        return {
            "id": invitation.get("id"),
            "email": invitation.get("email_address"),
            "role": invitation.get("role"),
            "status": invitation.get("status"),
            "invited_at": invitation.get("created_at")
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invite SuperAdmin: {str(e)}"
        )


@router.delete("/team/member/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_super_admin(
    user_id: str,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove a SuperAdmin from the team.
    """
    try:
        # Don't allow removing yourself
        if user_id == current_admin.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove yourself from SuperAdmin team"
            )

        success = await clerk_organizations_service.remove_super_admin(user_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SuperAdmin not found or already removed"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove SuperAdmin: {str(e)}"
        )


@router.patch("/team/member/{user_id}/role", status_code=status.HTTP_200_OK)
async def update_super_admin_role(
    user_id: str,
    new_role: str,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a SuperAdmin's role.
    """
    try:
        success = await clerk_organizations_service.update_super_admin_role(
            user_id=user_id,
            new_role=new_role
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SuperAdmin not found"
            )

        return {"message": "Role updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update role: {str(e)}"
        )


# --- 2FA Endpoints ---

@router.post("/2fa/setup", response_model=SuperAdminTOTPSetupResponse)
async def setup_super_admin_2fa(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """
    Set up Two-Factor Authentication for Super Admin account.

    Returns TOTP secret, QR code URI, and backup codes.
    """
    try:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("User-Agent")

        result = await super_admin_2fa_service.setup_totp_for_admin(
            db=db,
            admin_user_id=str(current_admin.id),
            ip_address=ip_address,
            user_agent=user_agent
        )

        return SuperAdminTOTPSetupResponse(**result)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/2fa/verify", status_code=status.HTTP_200_OK)
async def verify_super_admin_2fa(
    request: SuperAdminTOTPVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """
    Verify TOTP code and enable 2FA for Super Admin account.
    """
    is_valid = await super_admin_2fa_service.verify_totp_code(
        db=db,
        admin_user_id=str(current_admin.id),
        code=request.code,
        enable_on_success=True
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid TOTP code"
        )

    return {"status": "verified", "message": "2FA enabled successfully"}


@router.post("/2fa/backup-codes", response_model=Dict[str, List[str]])
async def generate_super_admin_backup_codes(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """
    Generate new backup codes for Super Admin account.
    """
    try:
        backup_codes = await super_admin_2fa_service.generate_new_backup_codes(
            db=db,
            admin_user_id=str(current_admin.id)
        )

        return {"backup_codes": backup_codes}

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/2fa/status")
async def get_super_admin_2fa_status(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """
    Get 2FA status for Super Admin account.
    """
    is_enabled = await super_admin_2fa_service.is_totp_enabled(
        db, str(current_admin.id)
    )
    is_required = await super_admin_2fa_service.is_totp_required_for_admin(
        db, str(current_admin.id)
    )

    return {
        "is_enabled": is_enabled,
        "is_required": is_required
    }


@router.post("/2fa/requirement", status_code=status.HTTP_201_CREATED)
async def set_super_admin_2fa_requirement(
    request: SuperAdminTOTPRequirementRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """
    Set 2FA requirement for Super Admin roles globally or per tenant.
    """
    requirement = await super_admin_2fa_service.set_totp_requirement(
        db=db,
        is_required=request.is_required,
        role_id=request.role_id,
        tenant_id=request.tenant_id,
        grace_period_days=request.grace_period_days,
        admin_user_id=str(current_admin.id)
    )

    return {
        "id": str(requirement.id),
        "is_required": requirement.is_required,
        "role_id": requirement.role_id,
        "tenant_id": requirement.tenant_id,
        "grace_period_days": requirement.grace_period_days
    }


# --- IP Allowlist Endpoints ---

@router.get("/ip-allowlist")
async def get_super_admin_ip_allowlist(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """
    Get all IP allowlist entries for Super Admin access.
    """
    entries = await ip_allowlist_service.get_global_allowlist_entries(db)

    return {
        "entries": [
            {
                "id": str(entry.id),
                "ip_range": str(entry.ip_range),
                "description": entry.description,
                "is_active": entry.is_active,
                "expires_at": entry.expires_at.isoformat() if entry.expires_at else None,
                "created_at": entry.created_at.isoformat()
            }
            for entry in entries
        ]
    }


@router.post("/ip-allowlist", status_code=status.HTTP_201_CREATED)
async def add_super_admin_ip_allowlist_entry(
    request: SuperAdminIPAllowlistRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """
    Add IP address or range to Super Admin allowlist.
    """
    try:
        from datetime import datetime
        expires_at = None
        if request.expires_at:
            expires_at = datetime.fromisoformat(request.expires_at)

        entry = await ip_allowlist_service.add_global_allowlist_entry(
            db=db,
            ip_range=request.ip_range,
            description=request.description,
            expires_at=expires_at,
            created_by=str(current_admin.id)
        )

        return {
            "id": str(entry.id),
            "ip_range": str(entry.ip_range),
            "description": entry.description,
            "is_active": entry.is_active,
            "created_at": entry.created_at.isoformat()
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/ip-allowlist/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_super_admin_ip_allowlist_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """
    Remove IP allowlist entry for Super Admin access.
    """
    success = await ip_allowlist_service.remove_allowlist_entry(
        db=db,
        entry_id=entry_id,
        admin_user_id=str(current_admin.id)
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="IP allowlist entry not found"
        )


# --- Emergency Controls ---

@router.post("/emergency/lockout", status_code=status.HTTP_201_CREATED)
async def create_emergency_lockout(
    request: EmergencyLockoutRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """
    Create emergency system lockout.

    This will lock down the entire platform or specific tenants.
    """
    try:
        from datetime import datetime, timedelta
        from app.app.models.security.emergency import SystemLockout

        expires_at = None
        if request.duration_hours:
            expires_at = datetime.utcnow() + timedelta(hours=request.duration_hours)

        lockout = SystemLockout(
            is_platform_wide=True,
            reason=request.reason,
            message=request.message,
            allow_read_only=request.allow_read_only,
            expires_at=expires_at,
            created_by=current_admin.id
        )

        db.add(lockout)
        await db.commit()

        return {
            "id": str(lockout.id),
            "reason": lockout.reason,
            "message": lockout.message,
            "is_active": lockout.is_active,
            "expires_at": lockout.expires_at.isoformat() if lockout.expires_at else None,
            "created_at": lockout.created_at.isoformat()
        }

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create emergency lockout: {str(e)}"
        )


@router.get("/emergency/lockouts")
async def get_emergency_lockouts(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """
    Get all active emergency lockouts.
    """
    from sqlalchemy import select
    from app.app.models.security.emergency import SystemLockout

    result = await db.execute(
        select(SystemLockout).where(SystemLockout.is_active == True)
    )
    lockouts = result.scalars().all()

    return {
        "lockouts": [
            {
                "id": str(lockout.id),
                "is_platform_wide": lockout.is_platform_wide,
                "reason": lockout.reason,
                "message": lockout.message,
                "allow_read_only": lockout.allow_read_only,
                "expires_at": lockout.expires_at.isoformat() if lockout.expires_at else None,
                "created_at": lockout.created_at.isoformat()
            }
            for lockout in lockouts
        ]
    }


@router.delete("/emergency/lockout/{lockout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_emergency_lockout(
    lockout_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """
    Deactivate emergency lockout.
    """
    from datetime import datetime
    from app.app.models.security.emergency import SystemLockout

    lockout = await db.get(SystemLockout, lockout_id)
    if not lockout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency lockout not found"
        )

    lockout.is_active = False
    lockout.deactivated_at = datetime.utcnow()
    lockout.deactivated_by = current_admin.id

    await db.commit()


# --- Security Audit Logs ---

@router.get("/audit-logs")
async def get_super_admin_audit_logs(
    limit: int = 100,
    offset: int = 0,
    action: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """
    Get security audit logs for Super Admin actions.
    """
    from sqlalchemy import select, desc
    from app.app.models.audit.audit_log import AuditLog

    query = select(AuditLog).order_by(desc(AuditLog.timestamp))

    if action:
        query = query.where(AuditLog.action.contains(action))

    query = query.limit(limit).offset(offset)

    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "logs": [
            {
                "id": str(log.id),
                "user_id": str(log.user_id) if log.user_id else None,
                "action": log.action,
                "status": log.status,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "ip_address": log.ip_address,
                "timestamp": log.timestamp.isoformat(),
                "details": log.details
            }
            for log in logs
        ]
    }
