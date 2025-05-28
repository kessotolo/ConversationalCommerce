from sqlalchemy import Column, String, Enum, ForeignKey, Integer, Float, Text, DateTime, Index, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db import Base
import uuid
import enum


class OrderStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"


class OrderSource(str, enum.Enum):
    whatsapp = "whatsapp"
    website = "website"
    instagram = "instagram"


class Order(Base):
    __tablename__ = "orders"

    # Define table indexes for better query performance
    __table_args__ = (
        Index('idx_whatsapp_order', 'whatsapp_number', 'message_id'),
        Index('idx_conversation_order', 'conversation_id'),
        Index('idx_order_seller', 'seller_id'),
        Index('idx_order_status', 'status'),
        Index('idx_order_created', 'created_at'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    seller_id = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)

    # WhatsApp-specific fields
    message_id = Column(String, nullable=True)  # WhatsApp message ID
    conversation_id = Column(String, nullable=True)  # WhatsApp conversation ID
    # Customer's WhatsApp number
    whatsapp_number = Column(String, nullable=True)

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
    order_source = Column(Enum(OrderSource), default=OrderSource.whatsapp)
    status = Column(Enum(OrderStatus), default=OrderStatus.pending)
    notes = Column(Text)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Additional fields for dashboard functionality
    is_deleted = Column(Boolean, default=False)
    notification_sent = Column(Boolean, default=False)
    payment_status = Column(String, default="pending")
    tracking_number = Column(String, nullable=True)
    shipping_carrier = Column(String, nullable=True)

    # Version column for optimistic locking - prevents concurrent modifications
    version = Column(Integer, default=0, nullable=False)
    
    # Relationships
    complaints = relationship("Complaint", back_populates="order")
