from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any
from uuid import UUID

from pydantic import BaseModel, Field


class ReturnReasonEnum(str, Enum):
    damaged = "damaged"
    incorrect_item = "incorrect_item"
    not_as_described = "not_as_described"
    changed_mind = "changed_mind"
    defective = "defective"
    arrived_late = "arrived_late"
    other = "other"


class ReturnStatusEnum(str, Enum):
    requested = "requested"
    approved = "approved"
    rejected = "rejected"
    in_transit = "in_transit"
    received = "received"
    refunded = "refunded"
    closed = "closed"


class ReturnItemRequest(BaseModel):
    order_item_id: UUID
    quantity: int
    reason: ReturnReasonEnum
    description: Optional[str] = None
    images: Optional[List[str]] = None


class OrderReturnRequest(BaseModel):
    """Schema for creating a return request"""
    order_id: UUID
    reason: ReturnReasonEnum
    description: Optional[str] = None
    items: List[ReturnItemRequest]


class OrderReturnUpdate(BaseModel):
    """Schema for updating return status"""
    status: ReturnStatusEnum
    tracking_number: Optional[str] = None
    return_label_url: Optional[str] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class OrderReturnResponse(BaseModel):
    """Schema for return response"""
    id: UUID
    order_id: UUID
    customer_id: UUID
    return_reason: ReturnReasonEnum
    return_description: Optional[str] = None
    return_status: ReturnStatusEnum
    items_returned: Dict[str, Any]  # JSON representation of returned items
    refund_amount: Optional[float] = None
    return_tracking_number: Optional[str] = None
    return_label_url: Optional[str] = None
    approval_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    requested_at: datetime
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderCancellationRequest(BaseModel):
    """Schema for cancellation request"""
    reason: str
    items: Optional[List[UUID]] = None  # Optional list of order item IDs to cancel (if partial)


class OrderCancellationResponse(BaseModel):
    """Schema for cancellation response"""
    order_id: UUID
    status: str
    cancellation_reason: str
    cancelled_at: datetime
    refund_amount: Optional[float] = None
    refund_status: Optional[str] = None

    class Config:
        from_attributes = True
