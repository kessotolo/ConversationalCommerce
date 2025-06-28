from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_tenant_id, get_db
from app.models.tenant import Tenant
from app.schemas.tenant import TenantOut, TenantUpdate

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


@router.patch("/by-subdomain/{subdomain}")
async def update_tenant_by_subdomain(subdomain: str, update: TenantUpdate, db: AsyncSession = Depends(get_db)):
    tenant = await db.execute(select(Tenant).where(Tenant.subdomain == subdomain))
    tenant = tenant.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if update.phone_number is not None:
        tenant.phone_number = update.phone_number
    if update.whatsapp_number is not None:
        tenant.whatsapp_number = update.whatsapp_number
    if update.email is not None:
        tenant.email = update.email
    await db.commit()
    await db.refresh(tenant)
    return TenantOut.model_validate(tenant)
