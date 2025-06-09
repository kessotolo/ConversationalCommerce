from sqlalchemy import Column, String, Enum, ForeignKey, Integer, Float, Text, DateTime, Index
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
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

    # Relationships
    complaints = relationship("Complaint", back_populates="order")
    # WhatsApp/conversational metadata (one-to-one)
    whatsapp_details = relationship(
        "WhatsAppOrderDetails",
        uselist=False,
        back_populates="order",
        lazy="joined",
        doc="WhatsApp/conversational metadata for this order."
    )

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
