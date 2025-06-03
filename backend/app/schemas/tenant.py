from pydantic import BaseModel
from typing import Optional
from pydantic import ConfigDict


class TenantOut(BaseModel):
    id: str
    name: str
    subdomain: str
    custom_domain: Optional[str]
    whatsapp_number: Optional[str]
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TenantUpdate(BaseModel):
    whatsapp_number: Optional[str]
