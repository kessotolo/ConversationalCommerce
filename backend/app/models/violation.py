from sqlalchemy import Column, String, Integer, Boolean, JSON, ForeignKey, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.base_class import Base


class Violation(Base):
    __tablename__ = "violations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    detection_id = Column(String, ForeignKey(
        "pattern_detections.id"), nullable=True)
    type = Column(String, nullable=False)  # e.g., content, behavior, security
    severity = Column(String, nullable=False)  # low, medium, high, critical
    # warning, temp_ban, perm_ban, restrict
    action = Column(String, nullable=False)
    status = Column(String, nullable=False,
                    default="active")  # active, resolved
    reason = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    start_at = Column(DateTime, default=datetime.utcnow)
    end_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="violations")
    user = relationship("User", back_populates="violations")
    detection = relationship("PatternDetection", back_populates="violations")

    def __repr__(self):
        return f"<Violation(id={self.id}, tenant_id={self.tenant_id}, user_id={self.user_id}, type={self.type}, severity={self.severity}, action={self.action}, status={self.status})>"
