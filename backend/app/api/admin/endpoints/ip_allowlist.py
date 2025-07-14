"""
IP Allowlisting endpoints for admin interface.

This module provides endpoints for:
- Managing IP allowlist entries
- Setting allowlist enforcement policies
- Managing temporary bypasses
"""

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field, validator, IPvAnyNetwork, IPvAnyAddress

from app.api.deps import get_db
from app.services.security.ip_allowlist_service import IPAllowlistService
from app.services.admin.auth.dependencies import get_current_admin_user
from app.models.admin.admin_user import AdminUser


router = APIRouter(prefix="/ip-allowlist", tags=["ip-allowlist"])
ip_allowlist_service = IPAllowlistService()


# --- IP Allowlist Schemas ---

class IPAllowlistEntryCreate(BaseModel):
    """Schema for creating an IP allowlist entry."""
    ip_range: str
    description: Optional[str] = None
    user_id: Optional[uuid.UUID] = None
    role_id: Optional[uuid.UUID] = None
    tenant_id: Optional[uuid.UUID] = None
    is_global: bool = False
    expires_at: Optional[datetime] = None
    
    @validator('ip_range')
    def validate_ip_range(cls, v):
        """Validate the IP range is in CIDR format."""
        try:
            IPvAnyNetwork(v)
            return v
        except ValueError:
            raise ValueError("Invalid IP range format. Must be a valid IP address or CIDR range.")
    
    @validator('is_global')
    def validate_scope(cls, v, values):
        """Ensure at least one scope is specified if not global."""
        if not v and not any([values.get('user_id'), values.get('role_id'), values.get('tenant_id')]):
            raise ValueError("Must specify at least one of user_id, role_id, tenant_id, or set is_global=True")
        return v


class IPAllowlistEntryResponse(BaseModel):
    """Schema for IP allowlist entry responses."""
    id: uuid.UUID
    ip_range: str
    description: Optional[str]
    user_id: Optional[uuid.UUID]
    role_id: Optional[uuid.UUID]
    tenant_id: Optional[uuid.UUID]
    is_global: bool
    is_active: bool
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID

    class Config:
        orm_mode = True


class IPAllowlistSettingCreate(BaseModel):
    """Schema for creating/updating IP allowlist enforcement settings."""
    is_enforced: bool
    role_id: Optional[uuid.UUID] = None
    tenant_id: Optional[uuid.UUID] = None
    allow_temporary_bypass: bool = True
    temporary_bypass_duration_minutes: int = Field(60, ge=5, le=1440)  # 5 min to 24 hours
    geo_restrict_countries: Optional[List[str]] = None
    geo_block_countries: Optional[List[str]] = None
    
    @validator('geo_restrict_countries', 'geo_block_countries')
    def validate_country_codes(cls, v):
        """Validate country codes are ISO 2-letter codes."""
        if v:
            for code in v:
                if len(code) != 2 or not code.isalpha():
                    raise ValueError(f"Invalid country code: {code}. Must be a 2-letter ISO code.")
        return v


class IPAllowlistSettingResponse(BaseModel):
    """Schema for IP allowlist setting responses."""
    id: uuid.UUID
    role_id: Optional[uuid.UUID]
    tenant_id: Optional[uuid.UUID]
    is_enforced: bool
    allow_temporary_bypass: bool
    temporary_bypass_duration_minutes: int
    geo_restrict_countries: Optional[List[str]]
    geo_block_countries: Optional[List[str]]
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID
    updated_by: uuid.UUID

    class Config:
        orm_mode = True


class TemporaryBypassCreate(BaseModel):
    """Schema for creating a temporary bypass."""
    ip_address: str
    duration_minutes: int = Field(60, ge=5, le=1440)  # 5 min to 24 hours
    reason: Optional[str] = None
    verification_method: str = "email"
    
    @validator('ip_address')
    def validate_ip_address(cls, v):
        """Validate the IP address."""
        try:
            IPvAnyAddress(v)
            return v
        except ValueError:
            raise ValueError("Invalid IP address format.")


class TemporaryBypassResponse(BaseModel):
    """Schema for temporary bypass responses."""
    id: uuid.UUID
    user_id: uuid.UUID
    ip_address: str
    created_at: datetime
    expires_at: datetime
    reason: Optional[str]
    verification_method: str

    class Config:
        orm_mode = True


# --- IP Allowlist Endpoints ---

@router.post("/entries", response_model=IPAllowlistEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_ip_allowlist_entry(
    entry: IPAllowlistEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user)
):
    """
    Add a new IP allowlist entry.
    
    Requires super admin permission.
    """
    # Check if the user is a super admin
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can manage IP allowlist entries"
        )
    
    try:
        result = await ip_allowlist_service.add_allowlist_entry(
            db=db,
            ip_range=entry.ip_range,
            description=entry.description,
            user_id=entry.user_id,
            role_id=entry.role_id,
            tenant_id=entry.tenant_id,
            is_global=entry.is_global,
            expires_at=entry.expires_at,
            created_by=current_user.id
        )
        
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ip_allowlist_entry(
    entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user)
):
    """
    Remove an IP allowlist entry.
    
    Requires super admin permission.
    """
    # Check if the user is a super admin
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can manage IP allowlist entries"
        )
    
    success = await ip_allowlist_service.remove_allowlist_entry(
        db=db,
        entry_id=entry_id,
        admin_user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="IP allowlist entry not found"
        )
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/settings", response_model=IPAllowlistSettingResponse, status_code=status.HTTP_201_CREATED)
async def set_ip_allowlist_enforcement(
    setting: IPAllowlistSettingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user)
):
    """
    Set IP allowlist enforcement settings.
    
    Requires super admin permission.
    """
    # Check if the user is a super admin
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can manage IP allowlist settings"
        )
    
    result = await ip_allowlist_service.set_allowlist_enforcement(
        db=db,
        is_enforced=setting.is_enforced,
        role_id=setting.role_id,
        tenant_id=setting.tenant_id,
        allow_temporary_bypass=setting.allow_temporary_bypass,
        temporary_bypass_duration_minutes=setting.temporary_bypass_duration_minutes,
        geo_restrict_countries=setting.geo_restrict_countries,
        geo_block_countries=setting.geo_block_countries,
        admin_user_id=current_user.id
    )
    
    return result


@router.post("/temporary-bypass", response_model=TemporaryBypassResponse, status_code=status.HTTP_201_CREATED)
async def create_temporary_bypass(
    request: Request,
    bypass: TemporaryBypassCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user)
):
    """
    Create a temporary bypass for the current user's IP address.
    
    This endpoint can be used when a user is accessing from a new location
    and needs temporary access before adding the IP to the allowlist.
    """
    # For security, we always use the client's actual IP address
    # rather than a provided one
    client_ip = request.client.host if request.client else None
    
    if not client_ip:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not determine client IP address"
        )
    
    # Get user agent
    user_agent = request.headers.get("User-Agent")
    
    result = await ip_allowlist_service.create_temporary_bypass(
        db=db,
        user_id=current_user.id,
        ip_address=client_ip,
        duration_minutes=bypass.duration_minutes,
        reason=bypass.reason,
        user_agent=user_agent,
        verification_method=bypass.verification_method
    )
    
    return result


@router.get("/check", status_code=status.HTTP_200_OK)
async def check_ip_allowed(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user)
):
    """
    Check if the current user's IP address is allowed.
    
    This endpoint can be used to proactively check if a user's IP
    is on the allowlist before they need to perform restricted actions.
    """
    # Get client IP
    client_ip = request.client.host if request.client else None
    
    if not client_ip:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not determine client IP address"
        )
    
    # Get user roles
    role_ids = [role.id for role in current_user.roles] if current_user.roles else []
    
    # Check if IP is allowed
    is_allowed = await ip_allowlist_service.is_ip_allowed(
        db=db,
        ip_address=client_ip,
        user_id=current_user.id,
        roles=role_ids,
        tenant_id=current_user.tenant_id
    )
    
    return {
        "ip_address": client_ip,
        "is_allowed": is_allowed,
        "has_temporary_bypass": await ip_allowlist_service.has_temporary_bypass(
            db=db,
            user_id=current_user.id,
            ip_address=client_ip
        ) if not is_allowed else False
    }
