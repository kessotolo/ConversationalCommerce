from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.app.api import deps
from app.app.core.content.content_analysis import content_analysis_service
from app.app.models.content_filter import ContentAnalysisResult, ContentFilterRule
from app.app.schemas.content_filter import (
    ContentAnalysisResultResponse,
    ContentFilterRuleCreate,
    ContentFilterRuleResponse,
    ContentFilterRuleUpdate,
    ContentReviewUpdate,
)

router = APIRouter()


@router.post("/rules", response_model=ContentFilterRuleResponse)
async def create_filter_rule(
    *,
    db: Session = Depends(deps.get_db),
    rule_in: ContentFilterRuleCreate,
    current_user=Depends(deps.get_current_user)
):
    """Create a new content filter rule"""
    rule = ContentFilterRule(tenant_id=current_user.tenant_id, **rule_in.dict())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/rules", response_model=List[ContentFilterRuleResponse])
async def list_filter_rules(
    *,
    db: Session = Depends(deps.get_db),
    content_type: Optional[str] = None,
    enabled: Optional[bool] = None,
    current_user=Depends(deps.get_current_user)
):
    """List content filter rules"""
    query = db.query(ContentFilterRule).filter(
        ContentFilterRule.tenant_id == current_user.tenant_id
    )

    if content_type:
        query = query.filter(ContentFilterRule.content_type == content_type)
    if enabled is not None:
        query = query.filter(ContentFilterRule.enabled == enabled)

    return query.all()


@router.get("/rules/{rule_id}", response_model=ContentFilterRuleResponse)
async def get_filter_rule(
    *,
    db: Session = Depends(deps.get_db),
    rule_id: str,
    current_user=Depends(deps.get_current_user)
):
    """Get a specific content filter rule"""
    rule = (
        db.query(ContentFilterRule)
        .filter(
            ContentFilterRule.id == rule_id,
            ContentFilterRule.tenant_id == current_user.tenant_id,
        )
        .first()
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.put("/rules/{rule_id}", response_model=ContentFilterRuleResponse)
async def update_filter_rule(
    *,
    db: Session = Depends(deps.get_db),
    rule_id: str,
    rule_in: ContentFilterRuleUpdate,
    current_user=Depends(deps.get_current_user)
):
    """Update a content filter rule"""
    rule = (
        db.query(ContentFilterRule)
        .filter(
            ContentFilterRule.id == rule_id,
            ContentFilterRule.tenant_id == current_user.tenant_id,
        )
        .first()
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    for field, value in rule_in.dict(exclude_unset=True).items():
        setattr(rule, field, value)

    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}")
async def delete_filter_rule(
    *,
    db: Session = Depends(deps.get_db),
    rule_id: str,
    current_user=Depends(deps.get_current_user)
):
    """Delete a content filter rule"""
    rule = (
        db.query(ContentFilterRule)
        .filter(
            ContentFilterRule.id == rule_id,
            ContentFilterRule.tenant_id == current_user.tenant_id,
        )
        .first()
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    db.delete(rule)
    db.commit()
    return {"status": "success"}


@router.post("/analyze")
async def analyze_content(
    *,
    content_type: str,
    content_id: str,
    field: str,
    content: str,
    current_user=Depends(deps.get_current_user)
):
    """Analyze content against filter rules"""
    results = await content_analysis_service.analyze_content(
        tenant_id=current_user.tenant_id,
        content_type=content_type,
        content_id=content_id,
        field=field,
        content=content,
    )
    return results


@router.get("/results", response_model=List[ContentAnalysisResultResponse])
async def list_analysis_results(
    *,
    db: Session = Depends(deps.get_db),
    content_type: Optional[str] = None,
    status: Optional[str] = None,
    review_status: Optional[str] = None,
    current_user=Depends(deps.get_current_user)
):
    """List content analysis results"""
    query = db.query(ContentAnalysisResult).filter(
        ContentAnalysisResult.tenant_id == current_user.tenant_id
    )

    if content_type:
        query = query.filter(ContentAnalysisResult.content_type == content_type)
    if status:
        query = query.filter(ContentAnalysisResult.status == status)
    if review_status:
        query = query.filter(ContentAnalysisResult.review_status == review_status)

    return query.all()


@router.put("/results/{result_id}/review", response_model=ContentAnalysisResultResponse)
async def review_content(
    *,
    db: Session = Depends(deps.get_db),
    result_id: str,
    review_in: ContentReviewUpdate,
    current_user=Depends(deps.get_current_user)
):
    """Review content analysis result"""
    result = (
        db.query(ContentAnalysisResult)
        .filter(
            ContentAnalysisResult.id == result_id,
            ContentAnalysisResult.tenant_id == current_user.tenant_id,
        )
        .first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="Analysis result not found")

    result.review_status = review_in.status
    result.reviewed_by = current_user.id
    result.reviewed_at = datetime.utcnow()

    db.add(result)
    db.commit()
    db.refresh(result)
    return result
