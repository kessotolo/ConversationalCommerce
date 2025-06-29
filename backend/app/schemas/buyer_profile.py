from datetime import datetime
from typing import Dict, Optional, Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class BuyerProfileBase(BaseModel):
    """Base schema for buyer profile data."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    two_factor_enabled: Optional[bool] = False
    recovery_email: Optional[EmailStr] = None
    communication_preferences: Optional[Dict[str, Any]] = None
    display_preferences: Optional[Dict[str, Any]] = None


class BuyerProfileCreate(BuyerProfileBase):
    """Schema for creating a new buyer profile."""
    customer_id: UUID
    tenant_id: UUID


class BuyerProfileUpdate(BuyerProfileBase):
    """Schema for updating an existing buyer profile.
    All fields are optional to allow partial updates."""
    pass


class SecuritySettingsUpdate(BaseModel):
    """Schema for updating security-specific settings."""
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    two_factor_enabled: Optional[bool] = None
    recovery_email: Optional[EmailStr] = None


class BuyerProfileResponse(BuyerProfileBase):
    """Schema for buyer profile API responses."""
    id: UUID
    customer_id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True
