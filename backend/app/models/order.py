from sqlalchemy import Column, String, Enum, ForeignKey, Integer, Float, Text, DateTime, Index
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))

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

    # Indexes for WhatsApp-based queries
    __table_args__ = (
        Index('idx_whatsapp_order', 'whatsapp_number', 'message_id'),
        Index('idx_conversation_order', 'conversation_id'),
    )
