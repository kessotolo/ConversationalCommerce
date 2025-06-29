import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db import Base


class OrderStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"
    returned = "returned"


class OrderSource(str, enum.Enum):
    whatsapp = "whatsapp"
    website = "website"
    instagram = "instagram"


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    seller_id = Column(UUID(as_uuid=True), nullable=True)
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    customer_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    # Buyer Information
    buyer_name = Column(String, nullable=False)
    # Primary identifier for WhatsApp orders
    buyer_phone = Column(String, nullable=False, index=True)
    buyer_email = Column(String)
    buyer_address = Column(Text)

    # Order Details
    quantity = Column(Integer, default=1)
    total_amount = Column(Float, nullable=False)
    # Changed default to WhatsApp
    order_source = Column(
        Enum(OrderSource, create_type=False), default=OrderSource.whatsapp)
    status = Column(Enum(OrderStatus, create_type=False),
                    default=OrderStatus.pending)
    notes = Column(Text)

    # Version for optimistic locking
    version = Column(Integer, default=1, nullable=False)

    # Notification tracking
    notification_sent = Column(Boolean, default=False)
    last_notification_at = Column(DateTime(timezone=True))

    # Soft delete flag
    is_deleted = Column(Boolean, default=False)

    # Relationships
    complaints = relationship("Complaint", back_populates="order")
    channel_metadata = relationship(
        "OrderChannelMeta", back_populates="order", cascade="all, delete-orphan"
    )
    items = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )
    payments = relationship(
        "Payment", back_populates="order", cascade="all, delete-orphan")
    returns = relationship(
        "OrderReturn", back_populates="order", cascade="all, delete-orphan")
    # whatsapp_details = relationship(
    #     "WhatsAppOrderDetails",
    #     uselist=False,
    #     back_populates="order",
    #     lazy="joined",
    #     doc="WhatsApp/conversational metadata for this order."
    # )

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    cancelled_at = Column(DateTime(timezone=True))
    returned_at = Column(DateTime(timezone=True))
    cancellation_reason = Column(String)
    return_reason = Column(String)
