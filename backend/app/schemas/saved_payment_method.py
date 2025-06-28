import uuid
from typing import Optional, Dict
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from enum import Enum


class PaymentMethodType(str, Enum):
    CARD = "CARD"
    MOBILE_MONEY = "MOBILE_MONEY"
    BANK_TRANSFER = "BANK_TRANSFER"
    USSD = "USSD"


class SavedPaymentMethodBase(BaseModel):
    type: PaymentMethodType
    details: Dict[str, str]  # Encrypted JSON in DB, plain here
    is_default: bool = False


class SavedPaymentMethodCreate(SavedPaymentMethodBase):
    pass


class SavedPaymentMethodUpdate(BaseModel):
    type: Optional[PaymentMethodType] = None
    details: Optional[Dict[str, str]] = None
    is_default: Optional[bool] = None


class SavedPaymentMethodResponse(SavedPaymentMethodBase):
    id: uuid.UUID
    customer_id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
