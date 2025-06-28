import uuid
from typing import Optional, Dict
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class AddressBookBase(BaseModel):
    street: str
    city: str
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "Kenya"
    apartment: Optional[str] = None
    landmark: Optional[str] = None
    # {"latitude": float, "longitude": float}
    coordinates: Optional[Dict[str, float]] = None
    is_default: bool = False


class AddressBookCreate(AddressBookBase):
    pass


class AddressBookUpdate(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    apartment: Optional[str] = None
    landmark: Optional[str] = None
    coordinates: Optional[Dict[str, float]] = None
    is_default: Optional[bool] = None


class AddressBookResponse(AddressBookBase):
    id: uuid.UUID
    customer_id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
