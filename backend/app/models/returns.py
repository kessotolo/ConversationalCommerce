import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional

from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Float, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.app.db.base_class import Base


class ReturnStatus(str, Enum):
    """Possible statuses for a return request"""
    REQUESTED = "requested"  # Initial status when buyer requests return
    UNDER_REVIEW = "under_review"  # Seller is reviewing the return request
    APPROVED = "approved"  # Return request approved but items not yet received
    RECEIVED = "received"  # Return items received by seller
    PARTIAL_APPROVED = "partial_approved"  # Some items approved, others rejected
    REJECTED = "rejected"  # Return request rejected
    CANCELLED = "cancelled"  # Return request cancelled by buyer
    COMPLETED = "completed"  # Return processed and refund issued if applicable


class ReturnReason(str, Enum):
    """Standard reason codes for returns"""
    DEFECTIVE = "defective"  # Item is defective or damaged
    WRONG_ITEM = "wrong_item"  # Received incorrect item
    NOT_AS_DESCRIBED = "not_as_described"  # Item doesn't match description/images
    ARRIVED_LATE = "arrived_late"  # Item arrived too late
    NO_LONGER_NEEDED = "no_longer_needed"  # Buyer changed their mind
    SIZE_ISSUE = "size_issue"  # Size doesn't fit (clothing, etc.)
    QUALITY_ISSUE = "quality_issue"  # Quality not as expected
    OTHER = "other"  # Other reason (requires explanation)


class RefundMethod(str, Enum):
    """Types of refund methods"""
    ORIGINAL_PAYMENT = "original_payment"  # Refund to original payment method
    STORE_CREDIT = "store_credit"  # Refund as store credit
    MANUAL_PROCESSING = "manual_processing"  # Manually processed refund (offline)
    EXCHANGE = "exchange"  # Exchange item instead of refund


class ReturnRequest(Base):
    """Model for customer return requests"""
    __tablename__ = "return_requests"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Return details
    return_number = Column(String, nullable=False)  # Human-readable identifier (e.g., RET-12345)
    status = Column(String, nullable=False, default=ReturnStatus.REQUESTED.value)
    reason = Column(String, nullable=False)
    explanation = Column(Text, nullable=True)  # Additional details
    
    # Timing information
    requested_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    processed_at = Column(DateTime, nullable=True)  # When return was reviewed
    completed_at = Column(DateTime, nullable=True)  # When return was completed
    
    # Return logistics
    return_shipping_required = Column(Boolean, default=True)
    return_shipping_method = Column(String, nullable=True)
    return_shipping_carrier = Column(String, nullable=True)
    tracking_number = Column(String, nullable=True)
    tracking_url = Column(String, nullable=True)
    
    # Address for return (if different from customer address)
    return_address = Column(JSONB, nullable=True)
    
    # Refund details
    refund_method = Column(String, nullable=True)
    refund_amount = Column(Integer, nullable=True)  # In smallest currency unit (e.g., cents)
    refund_currency = Column(String, default="USD", nullable=False)
    refund_processed_at = Column(DateTime, nullable=True)
    refund_transaction_id = Column(String, nullable=True)
    
    # Approval information
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    order = relationship("Order", back_populates="return_requests")
    return_items = relationship("ReturnItem", back_populates="return_request", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ReturnRequest {self.return_number}>"


class ReturnItem(Base):
    """Model for individual items in a return request"""
    __tablename__ = "return_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    return_request_id = Column(UUID(as_uuid=True), ForeignKey("return_requests.id"), nullable=False)
    order_item_id = Column(UUID(as_uuid=True), ForeignKey("order_items.id"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    
    # Return details
    quantity = Column(Integer, nullable=False)  # Number of items being returned
    reason = Column(String, nullable=False)  # Can be different per item
    item_condition = Column(String, nullable=True)  # Condition of returned item
    
    # Status tracking
    status = Column(String, nullable=False, default=ReturnStatus.REQUESTED.value)
    
    # Refund calculation
    refund_amount = Column(Integer, nullable=True)  # In smallest currency unit (e.g., cents)
    refund_tax_amount = Column(Integer, nullable=True)
    refund_shipping_amount = Column(Integer, nullable=True)
    
    # Restocking details
    restocked = Column(Boolean, default=False)
    restocked_quantity = Column(Integer, default=0)
    restocked_at = Column(DateTime, nullable=True)
    
    # Store notes and customer notes
    store_notes = Column(Text, nullable=True)
    customer_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    return_request = relationship("ReturnRequest", back_populates="return_items")
    order_item = relationship("OrderItem")

    def __repr__(self):
        return f"<ReturnItem for {self.order_item_id}>"


# Add relationship to Order model
from app.app.models.order import Order
Order.return_requests = relationship("ReturnRequest", back_populates="order", cascade="all, delete-orphan")
