from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid

from pydantic import BaseModel, Field, validator, root_validator

from backend.app.models.returns import ReturnStatus, ReturnReason, RefundMethod


# Base schema for address used in returns
class ReturnAddressBase(BaseModel):
    full_name: str
    street_address1: str
    street_address2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str
    phone: Optional[str] = None
    email: Optional[str] = None


# Base schema for return items
class ReturnItemBase(BaseModel):
    order_item_id: uuid.UUID
    quantity: int = Field(gt=0)
    reason: ReturnReason
    item_condition: Optional[str] = None
    customer_notes: Optional[str] = None


# Schema for creating return items
class ReturnItemCreate(ReturnItemBase):
    pass


# Schema for updating return items
class ReturnItemUpdate(BaseModel):
    quantity: Optional[int] = Field(None, gt=0)
    reason: Optional[ReturnReason] = None
    item_condition: Optional[str] = None
    store_notes: Optional[str] = None
    customer_notes: Optional[str] = None
    status: Optional[ReturnStatus] = None
    refund_amount: Optional[int] = None
    refund_tax_amount: Optional[int] = None
    refund_shipping_amount: Optional[int] = None
    restocked: Optional[bool] = None
    restocked_quantity: Optional[int] = None
    restocked_at: Optional[datetime] = None


# Schema for return item response
class ReturnItemResponse(ReturnItemBase):
    id: uuid.UUID
    return_request_id: uuid.UUID
    order_item_id: uuid.UUID
    tenant_id: uuid.UUID
    status: ReturnStatus
    refund_amount: Optional[int] = None
    refund_tax_amount: Optional[int] = None
    refund_shipping_amount: Optional[int] = None
    restocked: bool
    restocked_quantity: int
    store_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Additional fields from OrderItem
    product_name: Optional[str] = None
    product_image: Optional[str] = None
    variant_name: Optional[str] = None
    unit_price: Optional[int] = None
    
    class Config:
        orm_mode = True


# Base schema for return requests
class ReturnRequestBase(BaseModel):
    order_id: uuid.UUID
    reason: ReturnReason
    explanation: Optional[str] = None
    return_shipping_required: Optional[bool] = True
    return_address: Optional[ReturnAddressBase] = None


# Schema for creating return requests
class ReturnRequestCreate(ReturnRequestBase):
    items: List[ReturnItemCreate] = Field(..., min_items=1)
    
    @validator('items')
    def validate_items(cls, items):
        if not items:
            raise ValueError('At least one item must be included in the return')
        return items


# Schema for updating return requests
class ReturnRequestUpdate(BaseModel):
    status: Optional[ReturnStatus] = None
    reason: Optional[ReturnReason] = None
    explanation: Optional[str] = None
    return_shipping_method: Optional[str] = None
    return_shipping_carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    return_address: Optional[ReturnAddressBase] = None
    refund_method: Optional[RefundMethod] = None
    refund_amount: Optional[int] = None
    rejection_reason: Optional[str] = None


# Schema for return request response
class ReturnRequestResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    order_id: uuid.UUID
    customer_id: uuid.UUID
    return_number: str
    status: ReturnStatus
    reason: ReturnReason
    explanation: Optional[str] = None
    requested_at: datetime
    processed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    return_shipping_required: bool
    return_shipping_method: Optional[str] = None
    return_shipping_carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    return_address: Optional[Dict[str, Any]] = None
    refund_method: Optional[RefundMethod] = None
    refund_amount: Optional[int] = None
    refund_currency: str
    refund_processed_at: Optional[datetime] = None
    refund_transaction_id: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Related objects
    items: Optional[List[ReturnItemResponse]] = None
    
    class Config:
        orm_mode = True


# Schema for list response
class ReturnRequestListResponse(BaseModel):
    items: List[ReturnRequestResponse]
    total: int
    page: int
    page_size: int
    
    class Config:
        orm_mode = True
