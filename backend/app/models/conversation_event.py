from sqlalchemy import Column, String, Enum, ForeignKey, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
from app.db.base_class import Base
import enum


class ConversationEventType(str, enum.Enum):
    message_sent = "message_sent"
    message_read = "message_read"
    product_clicked = "product_clicked"
    order_placed = "order_placed"
    # Add more event types as needed


class ConversationEvent(Base):
    """
    ConversationEvent logs all significant events in a conversation, not just messages.
    This enables analytics, monitoring, and extensibility for future event types.
    """
    __tablename__ = "conversation_event"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # FK to conversations if exists
    conversation_id = Column(UUID(as_uuid=True), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    event_type = Column(Enum(ConversationEventType), nullable=False)
    payload = Column(JSONB, nullable=True)  # Arbitrary event data
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    metadata = Column(JSONB, nullable=True)  # Optional extra context
