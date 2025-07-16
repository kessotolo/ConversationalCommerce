import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.types import Enum as SQLAlchemyEnum

from app.db.base_class import Base


class ComplaintStatus(str, enum.Enum):
    pending = "pending"
    in_review = "in_review"
    escalated = "escalated"
    resolved = "resolved"


class ComplaintTier(str, enum.Enum):
    tier1 = "tier1"  # Auto-response/basic support
    tier2 = "tier2"  # Staff review
    tier3 = "tier3"  # Admin escalation


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True)
    type = Column(String, nullable=False)  # product, order, user, other
    status = Column(SQLAlchemyEnum(ComplaintStatus), default=ComplaintStatus.pending)
    tier = Column(SQLAlchemyEnum(ComplaintTier), default=ComplaintTier.tier1)
    description = Column(String, nullable=False)
    resolution = Column(String, nullable=True)
    escalation_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="complaints")
    user = relationship("User", back_populates="complaints")
    product = relationship("Product", back_populates="complaints")
    order = relationship("Order", back_populates="complaints")
