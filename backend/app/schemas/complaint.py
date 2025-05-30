from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class ComplaintBase(BaseModel):
    type: str
    description: str
    product_id: Optional[str] = None
    order_id: Optional[str] = None


class ComplaintCreate(ComplaintBase):
    pass


class ComplaintUpdate(BaseModel):
    status: Optional[str] = None
    tier: Optional[str] = None
    resolution: Optional[str] = None
    escalation_reason: Optional[str] = None


class ComplaintEscalate(BaseModel):
    escalation_reason: str = Field(..., description="Reason for escalation")


class ComplaintResponse(ComplaintBase):
    id: str
    tenant_id: str
    user_id: Optional[str]
    status: str
    tier: str
    resolution: Optional[str]
    escalation_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
