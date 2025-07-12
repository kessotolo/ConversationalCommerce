from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TenantCreate(BaseModel):
    """
    Tenant creation schema for onboarding.
    """
    storeName: str
    businessName: str
    phoneNumber: str
    whatsappNumber: Optional[str] = None
    storeEmail: str
    category: str
    description: str
    subdomain: str
    userId: str


class TenantOut(BaseModel):
    """
    Tenant output schema. phone_number is required, whatsapp_number is optional.
    """
    id: str
    name: str
    subdomain: str
    custom_domain: Optional[str]
    phone_number: str
    whatsapp_number: Optional[str]
    email: Optional[str]
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TenantUpdate(BaseModel):
    """
    Tenant update schema. phone_number is required, whatsapp_number is optional.
    """
    phone_number: Optional[str]
    whatsapp_number: Optional[str]
    email: Optional[str]
