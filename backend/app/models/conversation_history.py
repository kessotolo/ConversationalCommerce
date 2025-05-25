from sqlalchemy import Column, String, Enum, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.db.base_class import Base
import enum


class SenderType(str, enum.Enum):
    merchant = "merchant"
    customer = "customer"
    bot = "bot"


class ChannelType(str, enum.Enum):
    whatsapp = "whatsapp"
    instagram = "instagram"
    storefront = "storefront"


class ConversationHistory(Base):
    __tablename__ = "conversation_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey(
        "orders.id"), nullable=True)
    message = Column(String, nullable=False)
    sender_type = Column(Enum(SenderType), nullable=False)
    channel = Column(Enum(ChannelType), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
