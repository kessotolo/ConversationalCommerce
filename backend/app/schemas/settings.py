from typing import Dict, Optional, List, Any, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime
from uuid import UUID


class SettingsDomainBase(BaseModel):
    """Base schema for settings domains."""
    name: str = Field(..., description="Name of the settings domain")
    description: Optional[str] = Field(
        None, description="Description of the settings domain")
    icon: Optional[str] = Field(
        None, description="Icon for the settings domain")
    order: Optional[int] = Field(0, description="Display order in UI")
    is_system: Optional[bool] = Field(
        False, description="Whether this is a system domain")


class SettingsDomainCreate(SettingsDomainBase):
    """Schema for creating a new settings domain."""
    pass


class SettingsDomainUpdate(BaseModel):
    """Schema for updating a settings domain."""
    name: Optional[str] = Field(
        None, description="Name of the settings domain")
    description: Optional[str] = Field(
        None, description="Description of the settings domain")
    icon: Optional[str] = Field(
        None, description="Icon for the settings domain")
    order: Optional[int] = Field(None, description="Display order in UI")


class SettingsDomainInDB(SettingsDomainBase):
    """Schema for a settings domain as stored in the database."""
    id: UUID = Field(..., description="Unique identifier")
    tenant_id: UUID = Field(...,
                            description="ID of the tenant this domain belongs to")
    created_at: datetime = Field(..., description="Timestamp when created")
    updated_at: datetime = Field(...,
                                 description="Timestamp when last updated")

    class Config:
        from_attributes = True


class SettingBase(BaseModel):
    """Base schema for individual settings."""
    key: str = Field(..., description="Unique key for the setting")
    value: Optional[Any] = Field(None, description="Value of the setting")
    value_type: str = Field(
        ..., description="Type of the value (string, number, boolean, object, array)")
    domain_id: UUID = Field(...,
                            description="ID of the domain this setting belongs to")
    is_encrypted: Optional[bool] = Field(
        False, description="Whether the value should be encrypted")
    is_system: Optional[bool] = Field(
        False, description="Whether this is a system setting")
    description: Optional[str] = Field(
        None, description="Description of the setting")
    default_value: Optional[Any] = Field(
        None, description="Default value for the setting")
    is_required: Optional[bool] = Field(
        False, description="Whether this setting is required")
    ui_component: Optional[str] = Field(
        None, description="UI component to use for editing")


class SettingCreate(SettingBase):
    """Schema for creating a new setting."""
    pass


class SettingUpdate(BaseModel):
    """Schema for updating a setting."""
    value: Optional[Any] = Field(None, description="Value of the setting")
    description: Optional[str] = Field(
        None, description="Description of the setting")
    is_encrypted: Optional[bool] = Field(
        None, description="Whether the value should be encrypted")
    ui_component: Optional[str] = Field(
        None, description="UI component to use for editing")


class SettingInDB(SettingBase):
    """Schema for a setting as stored in the database."""
    id: UUID = Field(..., description="Unique identifier")
    tenant_id: UUID = Field(...,
                            description="ID of the tenant this setting belongs to")
    created_at: datetime = Field(..., description="Timestamp when created")
    updated_at: datetime = Field(...,
                                 description="Timestamp when last updated")

    class Config:
        from_attributes = True


class SettingHistoryBase(BaseModel):
    """Base schema for setting history."""
    previous_value: Optional[Any] = Field(
        None, description="Previous value of the setting")
    new_value: Optional[Any] = Field(
        None, description="New value of the setting")
    changed_by: Optional[str] = Field(
        None, description="User who made the change")
    changed_at: datetime = Field(..., description="When the change was made")


class SettingHistoryCreate(SettingHistoryBase):
    """Schema for creating a new setting history entry."""
    setting_id: UUID = Field(...,
                             description="ID of the setting this history belongs to")


class SettingHistoryInDB(SettingHistoryBase):
    """Schema for a setting history entry as stored in the database."""
    setting_id: UUID = Field(...,
                             description="ID of the setting this history belongs to")

    class Config:
        from_attributes = True


class DomainWithSettings(BaseModel):
    """Schema for a domain with its settings."""
    domain: SettingsDomainInDB
    settings: List[SettingInDB]

    class Config:
        from_attributes = True


class SettingValue(BaseModel):
    """Schema for updating a setting value."""
    value: Any = Field(..., description="New value for the setting")


class BulkSettingUpdate(BaseModel):
    """Schema for bulk updating settings."""
    updates: List[Dict[str, Any]
                  ] = Field(..., description="List of setting updates")

    class Config:
        from_attributes = True


class SettingValidationError(BaseModel):
    """Schema for setting validation errors."""
    key: str
    error: str
    value: Any

    class Config:
        from_attributes = True


class SettingValidationResult(BaseModel):
    """Schema for setting validation results."""
    is_valid: bool
    errors: List[SettingValidationError]

    class Config:
        from_attributes = True
