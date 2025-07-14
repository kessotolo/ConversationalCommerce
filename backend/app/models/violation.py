import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.app.db.base_class import Base


class Violation(Base):
    __tablename__ = "violations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    detection_id = Column(
        UUID(as_uuid=True), ForeignKey("pattern_detections.id"), nullable=True
    )
    type = Column(String, nullable=False)  # e.g., content, behavior, security
    severity = Column(String, nullable=False)  # low, medium, high, critical
    # warning, temp_ban, perm_ban, restrict
    action = Column(String, nullable=False)
    status = Column(String, nullable=False,
                    default="active")  # active, resolved
    reason = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    start_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    end_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(
        timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("Tenant", back_populates="violations")
    user = relationship("User", back_populates="violations")
    detection = relationship("PatternDetection", back_populates="violations")

    def __repr__(self):
        return f"<Violation(id={self.id}, tenant_id={self.tenant_id}, user_id={self.user_id}, type={self.type}, severity={self.severity}, action={self.action}, status={self.status})>"
