"""
Pydantic schemas for feature flag management.
"""

import uuid
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class FeatureFlagBase(BaseModel):
    """Base model for feature flags."""
    key: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    is_enabled: bool = False
    feature_type: str = Field(..., min_length=1, max_length=50)
    config: Optional[Dict[str, Any]] = None


class FeatureFlagCreate(FeatureFlagBase):
    """Schema for creating a feature flag."""
    pass


class FeatureFlagUpdate(BaseModel):
    """Schema for updating a feature flag."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    is_enabled: Optional[bool] = None
    feature_type: Optional[str] = Field(None, min_length=1, max_length=50)
    config: Optional[Dict[str, Any]] = None


class FeatureFlagResponse(FeatureFlagBase):
    """Schema for feature flag response."""
    id: uuid.UUID
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True


class TenantOverrideBase(BaseModel):
    """Base model for tenant feature flag overrides."""
    is_enabled: bool
    config_override: Optional[Dict[str, Any]] = None


class TenantOverrideCreate(TenantOverrideBase):
    """Schema for creating a tenant override."""
    pass


class TenantOverrideResponse(TenantOverrideBase):
    """Schema for tenant override response."""
    id: uuid.UUID
    tenant_id: uuid.UUID
    feature_flag_id: uuid.UUID
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True


class FeatureFlagWithOverridesResponse(FeatureFlagResponse):
    """Feature flag with tenant overrides."""
    tenant_overrides: List[TenantOverrideResponse]

    class Config:
        orm_mode = True
