import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, String, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from app.db import Base


class Customer(Base):
    __tablename__ = "customers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=True, index=True)
    phone = Column(String, unique=True, nullable=True, index=True)
    instagram_handle = Column(String, unique=True, nullable=True, index=True)
    whatsapp_id = Column(String, unique=True, nullable=True, index=True)
    first_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_activity = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    tags = Column(ARRAY(String), default=list)
    name = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
