from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
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

    @field_validator('whatsapp_number', 'buyer_phone')
    @classmethod
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

    @field_validator('order_source')
    @classmethod
    def validate_order_source(cls, v, info):
        # Get values from info.data
        values = info.data
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
    tracking_number: Optional[str] = Field(None, max_length=100)
    shipping_carrier: Optional[str] = Field(None, max_length=100)


class OrderResponse(OrderBase):
    id: UUID
    seller_id: UUID
    order_source: OrderSource
    status: OrderStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    whatsapp_number: Optional[str] = None
    message_id: Optional[str] = None
    conversation_id: Optional[str] = None
    is_deleted: bool = False
    notification_sent: bool = False
    payment_status: str = "pending"
    tracking_number: Optional[str] = None
    shipping_carrier: Optional[str] = None
    version: int

    model_config = ConfigDict(from_attributes=True)


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    tracking_number: Optional[str] = None
    shipping_carrier: Optional[str] = None


class OrderSearchParams(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    status: Optional[OrderStatus] = None
    order_source: Optional[OrderSource] = None
    search: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    limit: int = 100
    offset: int = 0


class OrderStats(BaseModel):
    total_orders: int
    total_revenue: float
    orders_by_status: Dict[str, int]
    orders_by_source: Dict[str, int]
    top_products: List[Dict[str, Any]]
    time_period_days: int


class PaginatedOrdersResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    items: List[OrderResponse]
    total: int
    limit: int
    offset: int
