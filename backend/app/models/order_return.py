import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    Float,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db import Base


class ReturnStatus(str, enum.Enum):
    requested = "requested"
    approved = "approved"
    rejected = "rejected"
    in_transit = "in_transit"
    received = "received"
    refunded = "refunded"
    closed = "closed"


class ReturnReason(str, enum.Enum):
    damaged = "damaged"
    incorrect_item = "incorrect_item"
    not_as_described = "not_as_described"
    changed_mind = "changed_mind"
    defective = "defective"
    arrived_late = "arrived_late"
    other = "other"


class OrderReturn(Base):
    """Model for order returns/refunds."""
    __tablename__ = "order_returns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    customer_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Return details
    return_reason = Column(Enum(ReturnReason, create_type=False), nullable=False)
    return_description = Column(Text)
    return_status = Column(
        Enum(ReturnStatus, create_type=False),
        default=ReturnStatus.requested,
        nullable=False
    )
    
    # Items being returned (may be partial return)
    items_returned = Column(JSONB, nullable=False) 
    
    # Return tracking
    refund_amount = Column(Float)
    return_tracking_number = Column(String)
    return_label_url = Column(String)
    
    # Admin processing details
    approved_by = Column(UUID(as_uuid=True))
    approval_notes = Column(Text)
    rejection_reason = Column(String)

    # Timestamps
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_at = Column(DateTime(timezone=True))
    rejected_at = Column(DateTime(timezone=True))
    received_at = Column(DateTime(timezone=True))
    refunded_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    order = relationship("Order", back_populates="returns")
