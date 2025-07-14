import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base
from app.models.conversation_history import ChannelType


class OrderChannelMeta(Base):
    __tablename__ = "order_channel_meta"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    channel = Column(Enum(ChannelType, create_type=False), nullable=False)
    message_id = Column(String, nullable=True)
    chat_session_id = Column(String, nullable=True)
    # Consider JSON if needed
    user_response_log = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, onupdate=lambda: datetime.now(timezone.utc))

    order = relationship("Order", back_populates="channel_metadata")
