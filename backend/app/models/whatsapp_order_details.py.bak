from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db import Base
import uuid
from datetime import datetime

class WhatsAppOrderDetails(Base):
    """
    Stores WhatsApp/conversational metadata for an order.
    One-to-one relationship with Order.
    """
    __tablename__ = "whatsapp_order_details"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), unique=True, nullable=False)
    whatsapp_number = Column(String, nullable=True)
    message_id = Column(String, nullable=True)
    conversation_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    order = relationship("Order", back_populates="whatsapp_details")