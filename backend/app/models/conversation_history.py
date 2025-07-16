import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base


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
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
