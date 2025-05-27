from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class ViolationBase(BaseModel):
    type: str
    severity: str
    action: str
    status: str
    reason: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    start_at: datetime
    end_at: Optional[datetime] = None


class ViolationResponse(ViolationBase):
    id: str
    tenant_id: str
    user_id: Optional[str]
    detection_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class ViolationResolveUpdate(BaseModel):
    notes: Optional[str] = Field(
        None, description="Resolution notes for resolving the violation.")
