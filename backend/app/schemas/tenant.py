from typing import Optional

from pydantic import BaseModel, ConfigDict


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
