from datetime import date, datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.app.models.order import OrderSource, OrderStatus
from app.app.schemas.order_channel_meta import OrderChannelMetaResponse
from app.app.schemas.shipping import ShippingDetails


class OrderBase(BaseModel):
    product_id: UUID
    buyer_name: str = Field(..., min_length=2, max_length=100)
    buyer_phone: str = Field(..., min_length=10, max_length=15)
    buyer_email: Optional[str] = Field(None, min_length=5, max_length=100)
    buyer_address: Optional[str] = Field(None, min_length=5, max_length=500)
    quantity: int = Field(..., gt=0)
    total_amount: float = Field(..., gt=0)
    notes: Optional[str] = Field(None, max_length=1000)
    channel: str = Field(..., description="Order channel: 'web', 'chat', etc.")


class OrderCreate(OrderBase):
    order_source: OrderSource = Field(
        default=OrderSource.whatsapp,
        description="Source of the order. Use OrderSource.website for storefront orders.",
    )
    shipping: ShippingDetails

    @field_validator("order_source")
    @classmethod
    def validate_order_source(cls, v, info):
        # Get values from info.data
        values = info.data
        # For website orders, email is required
        if v == OrderSource.website and not values.get("buyer_email"):
            raise ValueError("Email is required for website orders")
        return v

    @field_validator("channel")
    @classmethod
    def validate_channel(cls, v):
        allowed = {"web", "chat", "whatsapp", "sms", "telegram"}
        if v not in allowed:
            raise ValueError(f"Channel must be one of {allowed}")
        return v


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    notes: Optional[str] = Field(None, max_length=500)
    tracking_number: Optional[str] = Field(None, max_length=100)
    shipping_carrier: Optional[str] = Field(None, max_length=100)
    reason: Optional[str] = Field(None, max_length=500)


class OrderResponse(OrderBase):
    id: UUID
    seller_id: UUID
    order_source: OrderSource
    status: OrderStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    channel_metadata: Optional[list[OrderChannelMetaResponse]] = None
    version: int
    shipping: ShippingDetails

    model_config = ConfigDict(from_attributes=True)


class OrderSearchParams(BaseModel):
    """Parameters for order search and filtering"""
    status: Optional[OrderStatus] = None
    order_source: Optional[OrderSource] = None
    search: Optional[str] = Field(
        None, description="Search term for buyer name/phone/email")
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(default=100, le=1000)
    offset: int = Field(default=0, ge=0)


class PaginatedOrdersResponse(BaseModel):
    """Paginated response for order listings"""
    orders: List[OrderResponse]
    total: int
    limit: int
    offset: int
    has_more: bool

    @classmethod
    def create(cls, orders: List[OrderResponse], total: int, limit: int, offset: int):
        return cls(
            orders=orders,
            total=total,
            limit=limit,
            offset=offset,
            has_more=(offset + len(orders)) < total
        )


class OrderStats(BaseModel):
    """Order statistics for dashboard"""
    total_orders: int
    total_revenue: float
    average_order_value: float
    recent_orders: int
    orders_by_status: Dict[str, int]
    orders_by_source: Dict[str, int]
    period_days: int


class OrderUpdate(BaseModel):
    """Schema for updating order details"""
    buyer_name: Optional[str] = Field(None, min_length=2, max_length=100)
    buyer_phone: Optional[str] = Field(None, min_length=10, max_length=15)
    buyer_email: Optional[str] = Field(None, min_length=5, max_length=100)
    buyer_address: Optional[str] = Field(None, min_length=5, max_length=500)
    notes: Optional[str] = Field(None, max_length=1000)


class ModernOrderCreate(BaseModel):
    """Modern order creation schema using OrderChannelMeta for all channel data"""
    product_id: UUID
    buyer_name: str = Field(..., min_length=2, max_length=100)
    buyer_phone: str = Field(..., min_length=10, max_length=15)
    buyer_email: Optional[str] = Field(None, min_length=5, max_length=100)
    buyer_address: Optional[str] = Field(None, min_length=5, max_length=500)
    quantity: int = Field(..., gt=0)
    total_amount: float = Field(..., gt=0)
    notes: Optional[str] = Field(None, max_length=1000)
    order_source: OrderSource = Field(default=OrderSource.whatsapp)
    shipping: ShippingDetails
    channel_metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Channel-specific metadata (e.g., WhatsApp message_id, conversation_id)"
    )

    @field_validator("order_source")
    @classmethod
    def validate_order_source(cls, v, info):
        values = info.data
        if v == OrderSource.website and not values.get("buyer_email"):
            raise ValueError("Email is required for website orders")
        return v

    @field_validator("buyer_phone")
    @classmethod
    def validate_phone_number(cls, v):
        # Basic phone number validation
        if not v.replace("+", "").replace("-", "").replace(" ", "").isdigit():
            raise ValueError("Invalid phone number format")
        return v
