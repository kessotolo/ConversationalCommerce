from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID
import uuid

from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

from app.models.base import Base
from app.utils.uuid_utils import get_uuid_str


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(PostgresUUID(as_uuid=True),
                primary_key=True, default=uuid.uuid4)
    user_id = Column(PostgresUUID(as_uuid=True), nullable=False, index=True)
    tenant_id = Column(PostgresUUID(as_uuid=True), nullable=False, index=True)
    action = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)
    # Can reference different resource types, so String is OK
    resource_id = Column(String, nullable=False)
    severity = Column(String, nullable=False,
                      default="low")  # low, medium, high
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)

    def as_dict(self) -> Dict[str, Any]:
        """Convert instance to dictionary"""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "tenant_id": str(self.tenant_id),
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "severity": self.severity,
            "details": self.details or {},
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
