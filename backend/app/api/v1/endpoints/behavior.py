from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.models.behavior_analysis import BehaviorPattern, PatternDetection
from app.schemas.behavior import (
    BehaviorPatternCreate,
    BehaviorPatternUpdate,
    BehaviorPatternResponse,
    PatternDetectionResponse,
    DetectionReviewUpdate
)
from app.core.behavior.behavior_analysis import behavior_analysis_service
from datetime import datetime

router = APIRouter()


@router.post("/patterns", response_model=BehaviorPatternResponse)
async def create_behavior_pattern(
    *,
    db: Session = Depends(deps.get_db),
    pattern_in: BehaviorPatternCreate,
    current_user=Depends(deps.get_current_user)
):
    """Create a new behavior pattern"""
    pattern = BehaviorPattern(
        tenant_id=current_user.tenant_id,
        **pattern_in.dict()
    )
    db.add(pattern)
    db.commit()
    db.refresh(pattern)
    return pattern


@router.get("/patterns", response_model=List[BehaviorPatternResponse])
async def list_behavior_patterns(
    *,
    db: Session = Depends(deps.get_db),
    pattern_type: Optional[str] = None,
    enabled: Optional[bool] = None,
    current_user=Depends(deps.get_current_user)
):
    """List behavior patterns"""
    query = db.query(BehaviorPattern).filter(
        BehaviorPattern.tenant_id == current_user.tenant_id
    )

    if pattern_type:
        query = query.filter(BehaviorPattern.pattern_type == pattern_type)
    if enabled is not None:
        query = query.filter(BehaviorPattern.enabled == enabled)

    return query.all()


@router.get("/patterns/{pattern_id}", response_model=BehaviorPatternResponse)
async def get_behavior_pattern(
    *,
    db: Session = Depends(deps.get_db),
    pattern_id: str,
    current_user=Depends(deps.get_current_user)
):
    """Get a specific behavior pattern"""
    pattern = db.query(BehaviorPattern).filter(
        BehaviorPattern.id == pattern_id,
        BehaviorPattern.tenant_id == current_user.tenant_id
    ).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    return pattern


@router.put("/patterns/{pattern_id}", response_model=BehaviorPatternResponse)
async def update_behavior_pattern(
    *,
    db: Session = Depends(deps.get_db),
    pattern_id: str,
    pattern_in: BehaviorPatternUpdate,
    current_user=Depends(deps.get_current_user)
):
    """Update a behavior pattern"""
    pattern = db.query(BehaviorPattern).filter(
        BehaviorPattern.id == pattern_id,
        BehaviorPattern.tenant_id == current_user.tenant_id
    ).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    for field, value in pattern_in.dict(exclude_unset=True).items():
        setattr(pattern, field, value)

    db.add(pattern)
    db.commit()
    db.refresh(pattern)
    return pattern


@router.delete("/patterns/{pattern_id}")
async def delete_behavior_pattern(
    *,
    db: Session = Depends(deps.get_db),
    pattern_id: str,
    current_user=Depends(deps.get_current_user)
):
    """Delete a behavior pattern"""
    pattern = db.query(BehaviorPattern).filter(
        BehaviorPattern.id == pattern_id,
        BehaviorPattern.tenant_id == current_user.tenant_id
    ).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    db.delete(pattern)
    db.commit()
    return {"status": "success"}


@router.post("/analyze")
async def analyze_behavior(
    *,
    user_id: Optional[str] = None,
    activity_data: dict,
    current_user=Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """Analyze behavior against patterns"""
    detections = await behavior_analysis_service.analyze_behavior(
        db=db,
        tenant_id=current_user.tenant_id,
        user_id=user_id,
        activity_data=activity_data
    )
    return detections


@router.get("/detections", response_model=List[PatternDetectionResponse])
async def list_detections(
    *,
    db: Session = Depends(deps.get_db),
    pattern_type: Optional[str] = None,
    status: Optional[str] = None,
    review_status: Optional[str] = None,
    current_user=Depends(deps.get_current_user)
):
    """List pattern detections"""
    query = db.query(PatternDetection).filter(
        PatternDetection.tenant_id == current_user.tenant_id
    )

    if pattern_type:
        query = query.filter(PatternDetection.detection_type == pattern_type)
    if status:
        query = query.filter(PatternDetection.status == status)
    if review_status:
        query = query.filter(PatternDetection.review_status == review_status)

    return query.all()


@router.put("/detections/{detection_id}/review", response_model=PatternDetectionResponse)
async def review_detection(
    *,
    db: Session = Depends(deps.get_db),
    detection_id: str,
    review_in: DetectionReviewUpdate,
    current_user=Depends(deps.get_current_user)
):
    """Review a pattern detection"""
    detection = db.query(PatternDetection).filter(
        PatternDetection.id == detection_id,
        PatternDetection.tenant_id == current_user.tenant_id
    ).first()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")

    detection.review_status = review_in.status
    detection.reviewed_by = current_user.id
    detection.reviewed_at = datetime.utcnow()
    detection.resolution_notes = review_in.notes

    if review_in.status in ['approved', 'rejected']:
        detection.status = 'resolved'

    db.add(detection)
    db.commit()
    db.refresh(detection)
    return detection
