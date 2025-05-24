from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.db.base_class import Base


class AIConfig(Base):
    __tablename__ = "ai_config"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    merchant_id = Column(UUID(as_uuid=True),
                         ForeignKey("users.id"), nullable=False)
    style_tone = Column(String, nullable=True)
    auto_reply_enabled = Column(Boolean, default=False)
    # Could be JSON for more structure
    active_hours = Column(String, nullable=True)
    bot_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)
