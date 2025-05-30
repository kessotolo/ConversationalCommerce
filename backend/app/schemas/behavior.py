from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class BehaviorPatternBase(BaseModel):
    name: str
    description: Optional[str] = None
    pattern_type: str = Field(...,
                              description="Type of pattern (user, system, security)")
    conditions: List[Dict[str, Any]
                     ] = Field(..., description="Pattern matching conditions")
    severity: str = Field(...,
                          description="Severity level (low, medium, high, critical)")
    threshold: float = Field(..., description="Threshold for pattern matching")
    cooldown_minutes: int = Field(
        default=60, description="Cooldown period in minutes")
    enabled: bool = True


class BehaviorPatternCreate(BehaviorPatternBase):
    pass


class BehaviorPatternUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    pattern_type: Optional[str] = None
    conditions: Optional[List[Dict[str, Any]]] = None
    severity: Optional[str] = None
    threshold: Optional[float] = None
    cooldown_minutes: Optional[int] = None
    enabled: Optional[bool] = None


class BehaviorPatternResponse(BehaviorPatternBase):
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatternDetectionBase(BaseModel):
    detection_type: str
    confidence_score: float
    evidence: Dict[str, Any]
    status: str
    review_status: Optional[str] = None
    resolution_notes: Optional[str] = None


class PatternDetectionResponse(PatternDetectionBase):
    id: str
    tenant_id: str
    pattern_id: str
    user_id: Optional[str]
    reviewed_by: Optional[str]
    reviewed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DetectionReviewUpdate(BaseModel):
    status: str = Field(...,
                        description="New review status (approved/rejected/escalated)")
    notes: Optional[str] = Field(None, description="Resolution notes")


class EvidenceBase(BaseModel):
    evidence_type: str
    source: str
    data: Dict[str, Any]


class EvidenceResponse(EvidenceBase):
    id: str
    tenant_id: str
    detection_id: str
    collected_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
