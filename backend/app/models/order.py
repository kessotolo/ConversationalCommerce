import enum
import uuid
from datetime import datetime, timezone
from typing import Optional

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

from backend.app.db import Base


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

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    cancelled_at = Column(DateTime(timezone=True))
    returned_at = Column(DateTime(timezone=True))
    cancellation_reason = Column(String)
    return_reason = Column(String)

    # Property to access WhatsApp-specific metadata for backward compatibility
    @property
    def whatsapp_details(self) -> Optional['OrderChannelMeta']:
        """
        Get WhatsApp-specific metadata for this order.
        This replaces the old WhatsAppOrderDetails relationship.
        """
        from backend.app.models.conversation_history import ChannelType

        if not self.channel_metadata:
            return None

        # Find WhatsApp channel metadata
        for metadata in self.channel_metadata:
            if metadata.channel == ChannelType.whatsapp:
                return metadata
        return None

    # Helper method to check if order has WhatsApp metadata
    def has_whatsapp_metadata(self) -> bool:
        """Check if this order has WhatsApp-specific metadata"""
        return self.whatsapp_details is not None

    # Helper method to get WhatsApp phone number
    def get_whatsapp_number(self) -> Optional[str]:
        """Get WhatsApp phone number from metadata or buyer phone"""
        whatsapp_meta = self.whatsapp_details
        if whatsapp_meta and whatsapp_meta.user_response_log:
            return whatsapp_meta.user_response_log
        return self.buyer_phone if self.order_source == OrderSource.whatsapp else None
