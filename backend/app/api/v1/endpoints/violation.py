from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api import deps
from app.core.enforcement.violation_service import violation_service
from app.models.violation import Violation
from app.schemas.violation import ViolationResolveUpdate, ViolationResponse

router = APIRouter()


@router.get("/violations", response_model=List[ViolationResponse])
async def list_violations(
    *,
    db: Session = Depends(deps.get_db),
    user_id: Optional[str] = None,
    status: Optional[str] = None,
    action: Optional[str] = None,
    severity: Optional[str] = None,
    current_user=Depends(deps.get_current_user)
):
    """List violations for the current tenant (with optional filters)"""
    query = db.query(Violation).filter(Violation.tenant_id == current_user.tenant_id)
    if user_id:
        query = query.filter(Violation.user_id == user_id)
    if status:
        query = query.filter(Violation.status == status)
    if action:
        query = query.filter(Violation.action == action)
    if severity:
        query = query.filter(Violation.severity == severity)
    return query.order_by(Violation.created_at.desc()).all()


@router.get("/violations/{violation_id}", response_model=ViolationResponse)
async def get_violation(
    *,
    db: Session = Depends(deps.get_db),
    violation_id: str,
    current_user=Depends(deps.get_current_user)
):
    """Get a specific violation"""
    violation = (
        db.query(Violation)
        .filter(
            Violation.id == violation_id, Violation.tenant_id == current_user.tenant_id
        )
        .first()
    )
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")
    return violation


@router.put("/violations/{violation_id}/resolve", response_model=ViolationResponse)
async def resolve_violation(
    *,
    db: Session = Depends(deps.get_db),
    violation_id: str,
    update_in: ViolationResolveUpdate,
    current_user=Depends(deps.get_current_user)
):
    """Resolve a violation (with optional resolution notes)"""
    violation = (
        db.query(Violation)
        .filter(
            Violation.id == violation_id, Violation.tenant_id == current_user.tenant_id
        )
        .first()
    )
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")
    resolved = violation_service.resolve_violation(
        db=db, violation_id=violation_id, resolution_notes=update_in.notes
    )
    return resolved


@router.get("/violations/stats")
async def violation_stats(
    *, db: Session = Depends(deps.get_db), current_user=Depends(deps.get_current_user)
):
    """Get violation statistics (counts by type, severity, action, status)"""
    tenant_id = current_user.tenant_id
    total = (
        db.query(func.count(Violation.id))
        .filter(Violation.tenant_id == tenant_id)
        .scalar()
    )
    by_type = dict(
        db.query(Violation.type, func.count(Violation.id))
        .filter(Violation.tenant_id == tenant_id)
        .group_by(Violation.type)
        .all()
    )
    by_severity = dict(
        db.query(Violation.severity, func.count(Violation.id))
        .filter(Violation.tenant_id == tenant_id)
        .group_by(Violation.severity)
        .all()
    )
    by_action = dict(
        db.query(Violation.action, func.count(Violation.id))
        .filter(Violation.tenant_id == tenant_id)
        .group_by(Violation.action)
        .all()
    )
    by_status = dict(
        db.query(Violation.status, func.count(Violation.id))
        .filter(Violation.tenant_id == tenant_id)
        .group_by(Violation.status)
        .all()
    )
    return {
        "total": total,
        "by_type": by_type,
        "by_severity": by_severity,
        "by_action": by_action,
        "by_status": by_status,
    }


@router.get("/violations/trends")
async def violation_trends(
    *,
    db: Session = Depends(deps.get_db),
    days: int = 30,
    current_user=Depends(deps.get_current_user)
):
    """Get violation trends (count per day for the last N days)"""
    tenant_id = current_user.tenant_id
    cutoff = datetime.utcnow() - timedelta(days=days)
    results = (
        db.query(
            func.date_trunc("day", Violation.created_at).label("day"),
            func.count(Violation.id),
        )
        .filter(Violation.tenant_id == tenant_id, Violation.created_at >= cutoff)
        .group_by("day")
        .order_by("day")
        .all()
    )
    return [{"date": str(row[0].date()), "count": row[1]} for row in results]
