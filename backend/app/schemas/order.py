from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.order import OrderStatus, OrderSource


class OrderBase(BaseModel):
    product_id: UUID
    buyer_name: str = Field(..., min_length=2, max_length=100)
    buyer_phone: str = Field(..., min_length=10, max_length=15)
    buyer_email: Optional[str] = Field(None, min_length=5, max_length=100)
    buyer_address: Optional[str] = Field(None, min_length=5, max_length=500)
    quantity: int = Field(..., gt=0)
    total_amount: float = Field(..., gt=0)
    notes: Optional[str] = Field(None, max_length=1000)


class WhatsAppOrderCreate(OrderBase):
    whatsapp_number: str = Field(..., min_length=10, max_length=15)
    message_id: str
    conversation_id: str

    @validator('whatsapp_number', 'buyer_phone')
    def validate_phone_number(cls, v):
        # Basic phone number validation
        if not v.replace('+', '').replace('-', '').replace(' ', '').isdigit():
            raise ValueError('Invalid phone number format')
        return v


class OrderCreate(OrderBase):
    order_source: OrderSource = Field(
        default=OrderSource.whatsapp,
        description="Source of the order. Use OrderSource.website for storefront orders."
    )

    @validator('order_source')
    def validate_order_source(cls, v, values):
        # For website orders, email is required
        if v == OrderSource.website and not values.get('buyer_email'):
            raise ValueError('Email is required for website orders')
        return v


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    buyer_name: Optional[str] = Field(None, min_length=2, max_length=100)
    buyer_phone: Optional[str] = Field(None, min_length=10, max_length=15)
    buyer_email: Optional[str] = Field(None, min_length=5, max_length=100)
    buyer_address: Optional[str] = Field(None, min_length=5, max_length=500)
    quantity: Optional[int] = Field(None, gt=0)
    total_amount: Optional[float] = Field(None, gt=0)
    notes: Optional[str] = Field(None, max_length=1000)


class OrderResponse(OrderBase):
    id: UUID
    order_source: OrderSource
    status: OrderStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    whatsapp_number: Optional[str] = None
    message_id: Optional[str] = None
    conversation_id: Optional[str] = None

    class Config:
        from_attributes = True
