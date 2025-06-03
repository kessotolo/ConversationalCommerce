from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.tenant import Tenant
from app.schemas.tenant import TenantOut, TenantUpdate
from app.api.deps import get_current_tenant_id

router = APIRouter()


@router.get("/me", response_model=TenantOut)
def get_my_tenant(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.patch("/me", response_model=TenantOut)
def update_my_tenant(
    update: TenantUpdate,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    for field, value in update.dict(exclude_unset=True).items():
        setattr(tenant, field, value)
    db.commit()
    db.refresh(tenant)
    return tenant
