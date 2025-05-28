from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.models.complaint import Complaint
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintUpdate,
    ComplaintEscalate,
    ComplaintResponse
)
from app.services.complaint_service import complaint_service
from uuid import UUID

router = APIRouter()


@router.post("/complaints", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def create_complaint(
    *,
    db: Session = Depends(deps.get_db),
    complaint_in: ComplaintCreate,
    current_user=Depends(deps.get_current_user)
):
    complaint = complaint_service.create_complaint(
        db, current_user.tenant_id, current_user.id, complaint_in)
    return complaint


@router.get("/complaints", response_model=List[ComplaintResponse])
def list_complaints(
    *,
    db: Session = Depends(deps.get_db),
    status: Optional[str] = None,
    tier: Optional[str] = None,
    type: Optional[str] = None,
    current_user=Depends(deps.get_current_user)
):
    complaints = complaint_service.list_complaints(
        db, current_user.tenant_id, status, tier, type)
    return complaints


@router.get("/complaints/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(
    *,
    db: Session = Depends(deps.get_db),
    complaint_id: str,
    current_user=Depends(deps.get_current_user)
):
    complaint = complaint_service.get_complaint(
        db, current_user.tenant_id, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint


@router.patch("/complaints/{complaint_id}", response_model=ComplaintResponse)
def update_complaint(
    *,
    db: Session = Depends(deps.get_db),
    complaint_id: str,
    complaint_in: ComplaintUpdate,
    current_user=Depends(deps.get_current_user)
):
    complaint = complaint_service.update_complaint(
        db, current_user.tenant_id, complaint_id, complaint_in)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint


@router.post("/complaints/{complaint_id}/escalate", response_model=ComplaintResponse)
def escalate_complaint(
    *,
    db: Session = Depends(deps.get_db),
    complaint_id: str,
    escalation: ComplaintEscalate,
    current_user=Depends(deps.get_current_user)
):
    complaint = complaint_service.escalate_complaint(
        db, current_user.tenant_id, complaint_id, escalation)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint


@router.post("/complaints/{complaint_id}/resolve", response_model=ComplaintResponse)
def resolve_complaint(
    *,
    db: Session = Depends(deps.get_db),
    complaint_id: str,
    resolution: ComplaintUpdate,
    current_user=Depends(deps.get_current_user)
):
    complaint = complaint_service.resolve_complaint(
        db, current_user.tenant_id, complaint_id, resolution)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint
