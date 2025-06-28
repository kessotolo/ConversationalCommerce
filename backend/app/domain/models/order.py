import enum
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from app.core.exceptions import AppError

# ============================================================
# Domain enums
# ============================================================


class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    PROCESSING = "PROCESSING"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"
    FAILED = "FAILED"


class OrderSource(str, enum.Enum):
    WHATSAPP = "WHATSAPP"
    WEBSITE = "WEBSITE"
    INSTAGRAM = "INSTAGRAM"


class PaymentMethod(str, enum.Enum):
    CARD = "CARD"
    MOBILE_MONEY = "MOBILE_MONEY"
    CASH_ON_DELIVERY = "CASH_ON_DELIVERY"
    BANK_TRANSFER = "BANK_TRANSFER"
    USSD = "USSD"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"


# ============================================================
# Domain value objects
# ============================================================


class Money(BaseModel):
    amount: float
    currency: str = "KES"  # Default to Kenyan Shilling


class Coordinates(BaseModel):
    latitude: float
    longitude: float


class Address(BaseModel):
    street: str
    city: str
    state: str
    postal_code: Optional[str] = None
    country: str = "Kenya"  # Default to Kenya
    apartment: Optional[str] = None
    landmark: Optional[str] = None  # Important for African markets
    coordinates: Optional[Coordinates] = None


class CustomerInfo(BaseModel):
    id: Optional[str] = None  # Optional for guest checkout
    name: str
    # Email can be optional for WhatsApp orders
    email: Optional[EmailStr] = None
    phone: str
    is_guest: bool = True

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        import re

        if not re.match(r"^\+?[0-9]{10,15}$", v):
            raise OrderDomainError("Invalid phone number format")
        return v


class OrderItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_name: str
    quantity: int
    unit_price: Money
    total_price: Money
    variant_id: Optional[str] = None
    variant_name: Optional[str] = None
    image_url: Optional[str] = None


class ShippingDetails(BaseModel):
    address: Address
    method: str
    tracking_number: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    shipping_cost: Money
    notes: Optional[str] = None


class PaymentDetails(BaseModel):
    method: PaymentMethod
    status: PaymentStatus = PaymentStatus.PENDING
    transaction_id: Optional[str] = None
    provider: Optional[str] = None
    amount_paid: Money
    payment_date: Optional[datetime] = None
    receipt_url: Optional[str] = None
    last_four: Optional[str] = None  # For card payments
    phone_number: Optional[str] = None  # For mobile money


class OrderTimeline(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: OrderStatus
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))
    note: Optional[str] = None
    created_by: Optional[str] = None


# ============================================================
# Domain model
# ============================================================


class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    order_number: str
    customer: CustomerInfo
    items: List[OrderItem]
    total_amount: Money
    subtotal: Money
    tax: Money
    status: OrderStatus = OrderStatus.PENDING
    source: OrderSource
    shipping: ShippingDetails
    payment: PaymentDetails
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    timeline: List[OrderTimeline] = []
    idempotency_key: str
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))

    # Domain methods
    def can_be_cancelled(self) -> bool:
        """Check if an order can be cancelled"""
        return self.status in [OrderStatus.PENDING, OrderStatus.PAID]

    def can_be_refunded(self) -> bool:
        """Check if an order can be refunded"""
        return (
            self.status
            in [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED]
            and self.payment.status == PaymentStatus.COMPLETED
        )

    def is_complete(self) -> bool:
        """Check if an order has been completed"""
        return self.status == OrderStatus.DELIVERED

    def get_total_items(self) -> int:
        """Calculate the total items in an order"""
        return sum(item.quantity for item in self.items)

    def get_latest_timeline_event(self) -> Optional[OrderTimeline]:
        """Get the latest timeline event"""
        if not self.timeline:
            return None

        return sorted(self.timeline, key=lambda x: x.timestamp, reverse=True)[0]

    def add_timeline_event(
        self,
        status: OrderStatus,
        note: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> None:
        """Add a new timeline event to the order"""
        timeline_event = OrderTimeline(
            status=status, note=note, created_by=created_by)
        self.timeline.append(timeline_event)
        self.status = status
        self.updated_at = datetime.now(timezone.utc)


# ============================================================
# Request/Response models
# ============================================================


class CreateOrderRequest(BaseModel):
    customer: CustomerInfo
    items: List[OrderItem]
    shipping: ShippingDetails
    payment: PaymentDetails
    source: OrderSource
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    idempotency_key: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "customer": {
                    "name": "John Doe",
                    "email": "john@example.com",
                    "phone": "+254712345678",
                    "is_guest": True,
                },
                "items": [
                    {
                        "product_id": "550e8400-e29b-41d4-a716-446655440000",
                        "product_name": "Smartphone",
                        "quantity": 1,
                        "unit_price": {"amount": 45000, "currency": "KES"},
                        "total_price": {"amount": 45000, "currency": "KES"},
                    }
                ],
                "shipping": {
                    "address": {
                        "street": "123 Main St",
                        "city": "Nairobi",
                        "state": "Nairobi",
                        "country": "Kenya",
                        "landmark": "Near Central Park",
                    },
                    "method": "Standard Delivery",
                    "shipping_cost": {"amount": 500, "currency": "KES"},
                },
                "payment": {
                    "method": "MOBILE_MONEY",
                    "amount_paid": {"amount": 45500, "currency": "KES"},
                    "phone_number": "+254712345678",
                },
                "source": "WEBSITE",
                "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
            }
        }
    )


class OrderResponse(BaseModel):
    order: Order


class OrdersResponse(BaseModel):
    orders: List[Order]
    total: int
    page: Optional[int] = None
    limit: Optional[int] = None


class OrderDomainError(AppError):
    pass
