from datetime import datetime
from sqlalchemy import Column, DateTime, String, Text, Index
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.app.db.base_class import Base


class WebhookEvent(Base):
    """
    Tracks processed webhook events to ensure idempotency
    """
    __tablename__ = "webhook_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = Column(String, nullable=False)  # Payment provider name (paystack, mpesa, etc.)
    event_id = Column(String, nullable=False)  # Provider's event ID
    event_type = Column(String, nullable=False)  # Type of event (charge.success, etc.)
    payload = Column(Text, nullable=True)  # JSON payload of the event
    processed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Create an index on provider and event_id for fast lookups
    __table_args__ = (
        Index("ix_webhook_events_provider_event_id", "provider", "event_id", unique=True),
    )
