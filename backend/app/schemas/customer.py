import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr


class CustomerBase(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    instagram_handle: Optional[str] = None
    whatsapp_id: Optional[str] = None
    password_hash: Optional[str] = None
    tags: List[str] = []


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    pass


class CustomerInDBBase(CustomerBase):
    id: uuid.UUID
    first_seen: datetime
    last_activity: datetime

    model_config = ConfigDict(from_attributes=True)


class Customer(CustomerInDBBase):
    pass
