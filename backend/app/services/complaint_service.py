from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.models.complaint import Complaint
from app.schemas.complaint import ComplaintCreate, ComplaintEscalate, ComplaintUpdate


class ComplaintService:
    def create_complaint(
        self, db: Session, tenant_id: str, user_id: str, complaint_in: ComplaintCreate
    ) -> Complaint:
        complaint = Complaint(
            tenant_id=tenant_id,
            user_id=user_id,
            type=complaint_in.type,
            description=complaint_in.description,
            product_id=complaint_in.product_id,
            order_id=complaint_in.order_id,
        )
        db.add(complaint)
        db.commit()
        db.refresh(complaint)
        return complaint

    def list_complaints(
        self,
        db: Session,
        tenant_id: str,
        status: Optional[str] = None,
        tier: Optional[str] = None,
        type: Optional[str] = None,
    ) -> List[Complaint]:
        query = db.query(Complaint).filter(Complaint.tenant_id == tenant_id)
        if status:
            query = query.filter(Complaint.status == status)
        if tier:
            query = query.filter(Complaint.tier == tier)
        if type:
            query = query.filter(Complaint.type == type)
        return query.all()

    def get_complaint(
        self, db: Session, tenant_id: str, complaint_id: str
    ) -> Complaint:
        return (
            db.query(Complaint)
            .filter(
                and_(Complaint.tenant_id == tenant_id, Complaint.id == complaint_id)
            )
            .first()
        )

    async def update_complaint(
        self, db: AsyncSession, complaint_id: UUID, complaint_update: ComplaintUpdate
    ) -> Complaint:
        complaint = await db.get(Complaint, complaint_id)
        if not complaint:
            raise ComplaintNotFoundError("Complaint not found")
        # Permission and validation logic here as needed
        update_data = complaint_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(complaint, key, value)
        await db.commit()
        await db.refresh(complaint)
        return complaint

    def escalate_complaint(
        self,
        db: Session,
        tenant_id: str,
        complaint_id: str,
        escalation: ComplaintEscalate,
    ) -> Complaint:
        complaint = self.get_complaint(db, tenant_id, complaint_id)
        if not complaint:
            return None
        complaint.escalation_reason = escalation.escalation_reason
        complaint.tier = "tier2"  # Escalate to tier2
        db.add(complaint)
        db.commit()
        db.refresh(complaint)
        return complaint

    def resolve_complaint(
        self,
        db: Session,
        tenant_id: str,
        complaint_id: str,
        resolution: ComplaintUpdate,
    ) -> Complaint:
        complaint = self.get_complaint(db, tenant_id, complaint_id)
        if not complaint:
            return None
        complaint.status = "resolved"
        complaint.resolution = resolution.resolution
        db.add(complaint)
        db.commit()
        db.refresh(complaint)
        return complaint


complaint_service = ComplaintService()
