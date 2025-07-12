from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from backend.app.api.deps import get_current_tenant_id, get_db
from backend.app.models.tenant import Tenant
from backend.app.models.user import User
from backend.app.schemas.tenant import TenantOut, TenantUpdate, TenantCreate
from backend.app.services.tenant.service import TenantService

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


@router.get("/by-subdomain/{subdomain}", response_model=TenantOut)
async def get_tenant_by_subdomain(subdomain: str, db: AsyncSession = Depends(get_db)):
    tenant = await db.execute(select(Tenant).where(Tenant.subdomain == subdomain))
    tenant = tenant.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return TenantOut.model_validate(tenant)


@router.post("/", response_model=TenantOut)
async def create_tenant(
    tenant_data: TenantCreate,
    db: AsyncSession = Depends(get_db)
) -> TenantOut:
    """
    Create a new tenant during onboarding.
    """
    tenant_service = TenantService()

    try:
        # Convert user ID to UUID
        user_uuid = UUID(tenant_data.userId)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )

    # Check if user exists
    user_query = select(User).where(User.id == user_uuid)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Create tenant using service
    # Note: category and description are not stored in Tenant model
    # They could be stored in settings or a separate table in the future
    # Note: admin_user_id is not stored in Tenant model, so we don't pass it
    tenant = await tenant_service.create_tenant(
        db=db,
        name=tenant_data.businessName,
        subdomain=tenant_data.subdomain,
        phone_number=tenant_data.phoneNumber,
        whatsapp_number=tenant_data.whatsappNumber or tenant_data.phoneNumber,
        email=tenant_data.storeEmail,
        is_active=True
    )

    # Update user to associate with tenant
    user.tenant_id = tenant.id
    user.is_seller = True
    await db.commit()

    return TenantOut.model_validate(tenant)
