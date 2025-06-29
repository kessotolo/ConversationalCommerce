from datetime import datetime
from enum import Enum
from typing import Dict, Optional, Any
from uuid import UUID

from pydantic import BaseModel, Field


class PaymentMethodTypeEnum(str, Enum):
    credit_card = "credit_card"
    debit_card = "debit_card"
    mobile_money = "mobile_money"
    bank_account = "bank_account"
    paypal = "paypal"
    apple_pay = "apple_pay"
    google_pay = "google_pay"
    other = "other"


class PaymentMethodBase(BaseModel):
    """Base schema for payment method data."""
    payment_type: PaymentMethodTypeEnum
    nickname: Optional[str] = None
    provider: str
    is_default: Optional[bool] = False


class PaymentMethodCreate(PaymentMethodBase):
    """Schema for creating a new payment method.
    
    Note: The actual payment details (card number, etc.) are never
    stored directly. Instead, they're tokenized via the payment provider.
    """
    provider_token: str
    provider_payment_id: Optional[str] = None
    display_name: str
    last_four: str
    expiry_date: Optional[str] = None
    billing_address: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class PaymentMethodUpdate(BaseModel):
    """Schema for updating an existing payment method."""
    nickname: Optional[str] = None
    is_default: Optional[bool] = None
    billing_address: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class PaymentMethodResponse(PaymentMethodBase):
    """Schema for payment method API responses."""
    id: UUID
    customer_id: UUID
    tenant_id: UUID
    display_name: str
    last_four: str
    expiry_date: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
