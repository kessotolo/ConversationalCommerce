from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field


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

    model_config = ConfigDict(from_attributes=True)


class ViolationResolveUpdate(BaseModel):
    notes: Optional[str] = Field(
        None, description="Resolution notes for resolving the violation."
    )
