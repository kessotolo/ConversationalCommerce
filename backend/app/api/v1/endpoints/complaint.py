from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api import deps
from backend.app.api.auth import ClerkTokenData, require_auth
from backend.app.schemas.complaint import (
    ComplaintCreate,
    ComplaintEscalate,
    ComplaintResponse,
    ComplaintUpdate,
)
from backend.app.services.complaint_service import complaint_service
from backend.app.services.exceptions import (
    ComplaintNotFoundError,
    ComplaintPermissionError,
    ComplaintValidationError,
    DatabaseError,
)

router = APIRouter()


@router.post(
    "/complaints", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED
)
def create_complaint(
    *,
    db: Session = Depends(deps.get_db),
    complaint_in: ComplaintCreate,
    current_user=Depends(deps.get_current_user)
):
    complaint = complaint_service.create_complaint(
        db, current_user.tenant_id, current_user.id, complaint_in
    )
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
        db, current_user.tenant_id, status, tier, type
    )
    return complaints


@router.get("/complaints/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(
    *,
    db: Session = Depends(deps.get_db),
    complaint_id: str,
    current_user=Depends(deps.get_current_user)
):
    complaint = complaint_service.get_complaint(
        db, current_user.tenant_id, complaint_id
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint


@router.patch("/complaints/{complaint_id}", response_model=ComplaintResponse)
async def update_complaint(
    complaint_id: UUID,
    complaint_update: ComplaintUpdate,
    db: Session = Depends(deps.get_db),
    user: ClerkTokenData = Depends(require_auth),
):
    """
    Update a complaint by its ID. Only the owner or admin can update.
    """
    try:
        complaint = await complaint_service.update_complaint(
            db, complaint_id, complaint_update
        )
        return complaint
    except ComplaintNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ComplaintPermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ComplaintValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except DatabaseError:
        raise HTTPException(status_code=500, detail="Error updating complaint")


@router.post("/complaints/{complaint_id}/escalate", response_model=ComplaintResponse)
def escalate_complaint(
    *,
    db: Session = Depends(deps.get_db),
    complaint_id: str,
    escalation: ComplaintEscalate,
    current_user=Depends(deps.get_current_user)
):
    complaint = complaint_service.escalate_complaint(
        db, current_user.tenant_id, complaint_id, escalation
    )
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
        db, current_user.tenant_id, complaint_id, resolution
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint
