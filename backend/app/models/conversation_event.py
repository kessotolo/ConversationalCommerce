"""
ConversationEvent Pattern
------------------------
This file defines the ConversationEventType enum and ConversationEvent model, which are used for analytics and monitoring.

- When adding a new event type, update both this enum and the frontend ConversationEventType (see frontend/src/modules/conversation/models/event.ts).
- All analytics and monitoring should use this pattern for extensibility and consistency.
- See AI_AGENT_CONFIG.md for more details.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base_class import Base


class ConversationEventType(str, enum.Enum):
    message_sent = "message_sent"  # A message was sent
    message_read = "message_read"  # A message was read
    product_clicked = "product_clicked"  # A product was clicked/viewed
    order_placed = "order_placed"  # An order was placed
    conversation_started = "conversation_started"  # A new conversation was started
    user_joined = "user_joined"  # A user joined the conversation
    user_left = "user_left"  # A user left the conversation
    # The conversation was closed/resolved
    conversation_closed = "conversation_closed"
    # Add more event types as needed


class ConversationEvent(Base):
    """
    ConversationEvent logs all significant events in a conversation, not just messages.
    This enables analytics, monitoring, and extensibility for future event types.
    """

    __tablename__ = "conversation_events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # FK to conversations if exists
    conversation_id = Column(UUID(as_uuid=True), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    event_type = Column(Enum(ConversationEventType, create_type=False), nullable=False)
    payload = Column(JSONB, nullable=True)  # Arbitrary event data
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    event_metadata = Column(JSONB, nullable=True)  # Optional extra context
    customer_id = Column(UUID(as_uuid=True), ForeignKey(
        "customers.id"), nullable=True)
    channel = Column(String, nullable=True)
    source = Column(String, nullable=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey(
        "products.id"), nullable=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey(
        "orders.id"), nullable=True)
