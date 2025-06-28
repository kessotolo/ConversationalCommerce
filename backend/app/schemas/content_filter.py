from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field


class ContentFilterRuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    content_type: str
    field: str
    condition: str
    value: str
    severity: str
    action: str
    enabled: bool = True


class ContentFilterRuleCreate(ContentFilterRuleBase):
    pass


class ContentFilterRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    content_type: Optional[str] = None
    field: Optional[str] = None
    condition: Optional[str] = None
    value: Optional[str] = None
    severity: Optional[str] = None
    action: Optional[str] = None
    enabled: Optional[bool] = None


class ContentFilterRuleResponse(ContentFilterRuleBase):
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ContentAnalysisResultBase(BaseModel):
    content_type: str
    content_id: str
    field: str
    original_content: str
    analysis_type: str
    result: Dict[str, Any]
    status: str
    review_status: Optional[str] = None


class ContentAnalysisResultResponse(ContentAnalysisResultBase):
    id: str
    tenant_id: str
    rule_id: Optional[str]
    reviewed_by: Optional[str]
    reviewed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ContentReviewUpdate(BaseModel):
    status: str = Field(..., description="New review status (approved/rejected)")
