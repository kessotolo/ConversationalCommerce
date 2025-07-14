import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Union
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.order import Order, OrderStatus
from app.models.payment import PaymentSettings

# Define missing types as string literals to avoid import issues
PaymentStatus = str  # Will be replaced with actual enum when available
Money = Decimal  # Simple money representation

# ============================================================
# Base domain event classes
# ============================================================


class DomainEvent(BaseModel):
    """Base class for all domain events"""

    event_type: str
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))
    tenant_id: str
    event_metadata: Optional[Dict[str, Any]] = None


class OrderEvent(DomainEvent):
    """Base class for all order-related events"""

    order_id: str
    order_number: str


# ============================================================
# Specific order event types
# ============================================================


class OrderCreatedEvent(OrderEvent):
    """Event emitted when a new order is created"""

    event_type: str = "ORDER_CREATED"
    # Store order data as dict to avoid Pydantic serialization issues with SQLAlchemy models
    order_data: Optional[Dict[str, Any]] = None

    class Config:
        arbitrary_types_allowed = True


class OrderStatusChangedEvent(OrderEvent):
    """Event emitted when an order status changes"""

    event_type: str = "ORDER_STATUS_CHANGED"
    previous_status: OrderStatus
    new_status: OrderStatus
    changed_by: Optional[str] = None
    notes: Optional[str] = None


class PaymentProcessedEvent(OrderEvent):
    """Event emitted when a payment is processed"""

    event_type: str = "PAYMENT_PROCESSED"
    payment_status: PaymentStatus
    amount: Money
    transaction_id: Optional[str] = None
    payment_method: str
    payment_provider: Optional[str] = None


class OrderShippedEvent(OrderEvent):
    """Event emitted when an order is shipped"""

    event_type: str = "ORDER_SHIPPED"
    tracking_number: Optional[str] = None
    shipping_provider: Optional[str] = None
    estimated_delivery_date: Optional[datetime] = None


class OrderDeliveredEvent(OrderEvent):
    """Event emitted when an order is delivered"""

    event_type: str = "ORDER_DELIVERED"
    delivery_date: datetime
    received_by: Optional[str] = None
    delivery_notes: Optional[str] = None


class OrderCancelledEvent(OrderEvent):
    """Event emitted when an order is cancelled"""

    event_type: str = "ORDER_CANCELLED"
    cancellation_reason: Optional[str] = None
    cancelled_by: Optional[str] = None
    refund_initiated: bool = False


class OrderRefundedEvent(OrderEvent):
    """Event emitted when an order is refunded"""

    event_type: str = "ORDER_REFUNDED"
    refund_amount: Money
    refund_reason: Optional[str] = None
    refund_transaction_id: Optional[str] = None
    is_partial_refund: bool = False


# Union type of all order events for type checking
OrderEventUnion = Union[
    OrderCreatedEvent,
    OrderStatusChangedEvent,
    PaymentProcessedEvent,
    OrderShippedEvent,
    OrderDeliveredEvent,
    OrderCancelledEvent,
    OrderRefundedEvent,
]


# ============================================================
# Event factory for creating order events
# ============================================================


class OrderEventFactory:
    """Factory for creating order events"""

    @staticmethod
    def create_order_created_event(
        order: Order, metadata: Optional[Dict[str, Any]] = None
    ) -> OrderCreatedEvent:
        """Create an OrderCreatedEvent"""
        return OrderCreatedEvent(
            tenant_id=order.tenant_id,
            order_id=order.id,
            order_number=order.order_number,
            order_data={
                "id": str(order.id),
                "order_number": order.order_number,
                "status": order.status.value if order.status else None,
                "total_amount": float(order.total_amount) if order.total_amount else 0.0,
                "currency": order.currency,
                "created_at": order.created_at.isoformat() if order.created_at else None,
            },
            event_metadata=metadata,
        )

    @staticmethod
    def create_order_status_changed_event(
        order: Order,
        previous_status: OrderStatus,
        new_status: OrderStatus,
        changed_by: Optional[str] = None,
        notes: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> OrderStatusChangedEvent:
        """Create an OrderStatusChangedEvent"""
        return OrderStatusChangedEvent(
            tenant_id=order.tenant_id,
            order_id=order.id,
            order_number=order.order_number,
            previous_status=previous_status,
            new_status=new_status,
            changed_by=changed_by,
            notes=notes,
            event_metadata=metadata,
        )

    @staticmethod
    def create_payment_processed_event(
        order: Order,
        payment_status: PaymentStatus,
        amount: Money,
        transaction_id: Optional[str] = None,
        payment_method: Optional[str] = None,
        payment_provider: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> PaymentProcessedEvent:
        """Create a PaymentProcessedEvent"""
        return PaymentProcessedEvent(
            tenant_id=order.tenant_id,
            order_id=order.id,
            order_number=order.order_number,
            payment_status=payment_status,
            amount=amount,
            transaction_id=transaction_id,
            payment_method=payment_method or order.payment.method.value,
            payment_provider=payment_provider,
            event_metadata=metadata,
        )

    @staticmethod
    def create_order_shipped_event(
        order: Order,
        tracking_number: Optional[str] = None,
        shipping_provider: Optional[str] = None,
        estimated_delivery_date: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> OrderShippedEvent:
        """Create an OrderShippedEvent"""
        return OrderShippedEvent(
            tenant_id=order.tenant_id,
            order_id=order.id,
            order_number=order.order_number,
            tracking_number=tracking_number,
            shipping_provider=shipping_provider,
            estimated_delivery_date=estimated_delivery_date,
            event_metadata=metadata,
        )

    @staticmethod
    def create_order_delivered_event(
        order: Order,
        delivery_date: datetime = None,
        received_by: Optional[str] = None,
        delivery_notes: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> OrderDeliveredEvent:
        """Create an OrderDeliveredEvent"""
        if delivery_date is None:
            delivery_date = datetime.now(timezone.utc)

        return OrderDeliveredEvent(
            tenant_id=order.tenant_id,
            order_id=order.id,
            order_number=order.order_number,
            delivery_date=delivery_date,
            received_by=received_by,
            delivery_notes=delivery_notes,
            event_metadata=metadata,
        )

    @staticmethod
    def create_order_cancelled_event(
        order: Order,
        cancellation_reason: Optional[str] = None,
        cancelled_by: Optional[str] = None,
        refund_initiated: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> OrderCancelledEvent:
        """Create an OrderCancelledEvent"""
        return OrderCancelledEvent(
            tenant_id=order.tenant_id,
            order_id=order.id,
            order_number=order.order_number,
            cancellation_reason=cancellation_reason,
            cancelled_by=cancelled_by,
            refund_initiated=refund_initiated,
            event_metadata=metadata,
        )

    @staticmethod
    def create_order_refunded_event(
        order: Order,
        refund_amount: Money,
        refund_reason: Optional[str] = None,
        refund_transaction_id: Optional[str] = None,
        is_partial_refund: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> OrderRefundedEvent:
        """Create an OrderRefundedEvent"""
        return OrderRefundedEvent(
            tenant_id=order.tenant_id,
            order_id=order.id,
            order_number=order.order_number,
            refund_amount=refund_amount,
            refund_reason=refund_reason,
            refund_transaction_id=refund_transaction_id,
            is_partial_refund=is_partial_refund,
            event_metadata=metadata,
        )
