from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
import uuid
from app.utils.domain_validator import validate_subdomain, validate_domain


class StorefrontConfigBase(BaseModel):
    subdomain_name: Optional[str] = Field(None, description="Subdomain for the storefront")
    custom_domain: Optional[str] = Field(None, description="Custom domain for the storefront")
    meta_title: Optional[str] = Field(None, description="SEO meta title")
    meta_description: Optional[str] = Field(None, description="SEO meta description")
    theme_settings: Optional[Dict[str, Any]] = Field(None, description="Theme configuration")
    layout_config: Optional[Dict[str, Any]] = Field(None, description="Layout configuration")
    social_links: Optional[Dict[str, str]] = Field(None, description="Social media links")

    @field_validator("subdomain_name")
    @classmethod
    def validate_subdomain_name(cls, v):
        if v is not None:
            is_valid, error = validate_subdomain(v)
            if not is_valid:
                raise ValueError(error)
        return v

    @field_validator("custom_domain")
    @classmethod
    def validate_custom_domain(cls, v):
        if v is not None:
            is_valid, error = validate_domain(v)
            if not is_valid:
                raise ValueError(error)
        return v


class StorefrontConfigCreate(StorefrontConfigBase):
    pass


class StorefrontConfigUpdate(StorefrontConfigBase):
    pass


class StorefrontConfigResponse(StorefrontConfigBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    domain_verified: bool
    
    class Config:
        model_config = ConfigDict(from_attributes=True)


class DomainVerificationRequest(BaseModel):
    tenant_id: uuid.UUID = Field(..., description="ID of the tenant")


class DomainVerificationResponse(BaseModel):
    token: str = Field(..., description="Verification token")
    instructions: str = Field(..., description="Instructions for verification")


class DomainVerificationStatusResponse(BaseModel):
    is_verified: bool = Field(..., description="Whether the domain is verified")
    domain: str = Field(..., description="The domain being verified")


class StorefrontStatusUpdate(BaseModel):
    enabled: bool = Field(..., description="Whether the storefront is enabled")


class ThemeVariationsResponse(BaseModel):
    themes: Dict[str, Dict[str, Any]] = Field(..., description="Available theme variations")
