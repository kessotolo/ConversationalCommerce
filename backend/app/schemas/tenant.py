from pydantic import BaseModel
from typing import Optional


class TenantOut(BaseModel):
    id: str
    name: str
    subdomain: str
    custom_domain: Optional[str]
    whatsapp_number: Optional[str]
    is_active: bool

    class Config:
        orm_mode = True


class TenantUpdate(BaseModel):
    whatsapp_number: Optional[str]
