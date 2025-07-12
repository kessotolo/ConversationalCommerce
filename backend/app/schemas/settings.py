from typing import Dict, Optional, List, Any, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime
from uuid import UUID

from backend.app.schemas.common import TimestampSchema, UUIDSchema


class SettingsDomainBase(BaseModel):
    """Base schema for settings domains."""
    name: str = Field(..., description="Name of the settings domain")
    description: Optional[str] = Field(None, description="Description of the settings domain")
    icon: Optional[str] = Field(None, description="Icon for the settings domain")
    order: Optional[int] = Field(0, description="Display order in UI")
    is_system: Optional[bool] = Field(False, description="Whether this is a system domain")


class SettingsDomainCreate(SettingsDomainBase):
    """Schema for creating a new settings domain."""
    pass


class SettingsDomainUpdate(BaseModel):
    """Schema for updating a settings domain."""
    name: Optional[str] = Field(None, description="Name of the settings domain")
    description: Optional[str] = Field(None, description="Description of the settings domain")
    icon: Optional[str] = Field(None, description="Icon for the settings domain")
    order: Optional[int] = Field(None, description="Display order in UI")


class SettingsDomainInDB(SettingsDomainBase, UUIDSchema, TimestampSchema):
    """Schema for a settings domain as stored in the database."""
    tenant_id: UUID = Field(..., description="ID of the tenant this domain belongs to")

    class Config:
        orm_mode = True


class SettingBase(BaseModel):
    """Base schema for individual settings."""
    key: str = Field(..., description="Unique key for the setting")
    value: Optional[Any] = Field(None, description="Value of the setting")
    value_type: str = Field(..., description="Type of the value (string, number, boolean, object, array)")
    domain_id: UUID = Field(..., description="ID of the domain this setting belongs to")
    is_encrypted: Optional[bool] = Field(False, description="Whether the value should be encrypted")
    is_system: Optional[bool] = Field(False, description="Whether this is a system setting")
    description: Optional[str] = Field(None, description="Description of the setting")
    default_value: Optional[Any] = Field(None, description="Default value for the setting")
    is_required: Optional[bool] = Field(False, description="Whether this setting is required")
    ui_component: Optional[str] = Field(None, description="UI component to use for editing")
    ui_order: Optional[int] = Field(0, description="Display order in UI")
    schema: Optional[Dict[str, Any]] = Field(None, description="JSON Schema for validation")
    validation_rules: Optional[Dict[str, Any]] = Field(None, description="Additional validation rules")


class SettingCreate(SettingBase):
    """Schema for creating a new setting."""
    pass


class SettingUpdate(BaseModel):
    """Schema for updating a setting."""
    value: Optional[Any] = Field(None, description="Value of the setting")
    description: Optional[str] = Field(None, description="Description of the setting")
    default_value: Optional[Any] = Field(None, description="Default value for the setting")
    is_required: Optional[bool] = Field(None, description="Whether this setting is required")
    ui_component: Optional[str] = Field(None, description="UI component to use for editing")
    ui_order: Optional[int] = Field(None, description="Display order in UI")
    schema: Optional[Dict[str, Any]] = Field(None, description="JSON Schema for validation")
    validation_rules: Optional[Dict[str, Any]] = Field(None, description="Additional validation rules")


class SettingInDB(SettingBase, UUIDSchema, TimestampSchema):
    """Schema for a setting as stored in the database."""
    tenant_id: UUID = Field(..., description="ID of the tenant this setting belongs to")
    last_modified_at: Optional[datetime] = Field(None, description="When this setting was last modified")
    last_modified_by: Optional[str] = Field(None, description="User who last modified this setting")

    class Config:
        orm_mode = True


class SettingHistoryBase(BaseModel):
    """Base schema for setting history."""
    previous_value: Optional[Any] = Field(None, description="Previous value of the setting")
    new_value: Optional[Any] = Field(None, description="New value of the setting")
    changed_by: Optional[str] = Field(None, description="User who made the change")
    changed_at: datetime = Field(..., description="When the change was made")


class SettingHistoryCreate(SettingHistoryBase):
    """Schema for creating a new setting history entry."""
    setting_id: UUID = Field(..., description="ID of the setting this history belongs to")


class SettingHistoryInDB(SettingHistoryBase, UUIDSchema):
    """Schema for a setting history entry as stored in the database."""
    setting_id: UUID = Field(..., description="ID of the setting this history belongs to")

    class Config:
        orm_mode = True


class DomainWithSettings(SettingsDomainInDB):
    """Schema for a settings domain with all its settings."""
    settings: List[SettingInDB] = Field([], description="Settings in this domain")


class SettingValue(BaseModel):
    """Schema for updating a setting value."""
    value: Any = Field(..., description="New value for the setting")


class BulkSettingUpdate(BaseModel):
    """Schema for updating multiple settings at once."""
    settings: Dict[str, Any] = Field(..., description="Dictionary of setting keys and values")


class SettingValidationError(BaseModel):
    """Schema for a validation error on a setting."""
    key: str = Field(..., description="Key of the setting that failed validation")
    error: str = Field(..., description="Error message")


class SettingValidationResult(BaseModel):
    """Schema for the result of validating settings."""
    valid: bool = Field(..., description="Whether all settings are valid")
    errors: List[SettingValidationError] = Field([], description="List of validation errors")
