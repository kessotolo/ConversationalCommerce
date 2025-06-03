from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base
import uuid


class AlertConfig(Base):
    __tablename__ = "alert_config"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    event_type = Column(String, nullable=False)
    enabled = Column(Boolean, default=True)
    # Optionally: channel, threshold, recipients, etc.
