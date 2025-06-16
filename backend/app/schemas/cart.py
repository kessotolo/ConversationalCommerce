from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CartItemBase(BaseModel):
    product_id: UUID
    quantity: int = 1
    price_at_add: float
    variant_id: Optional[UUID] = None


class CartItemCreate(CartItemBase):
    pass


class CartItemUpdate(BaseModel):
    quantity: Optional[int]
    variant_id: Optional[UUID]


class CartItemResponse(CartItemBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CartBase(BaseModel):
    user_id: Optional[UUID]
    phone_number: Optional[str]
    session_id: Optional[str]
    tenant_id: UUID


class CartCreate(CartBase):
    items: Optional[List[CartItemCreate]] = []


class CartUpdate(BaseModel):
    items: Optional[List[CartItemUpdate]]


class CartResponse(CartBase):
    id: UUID
    items: List[CartItemResponse]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
