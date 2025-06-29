import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.api.deps import get_db, get_current_buyer
from app.models.buyer_profile import BuyerProfile
from app.schemas.buyer_profile import (
    BuyerProfileCreate,
    BuyerProfileUpdate,
    BuyerProfileResponse,
    SecuritySettingsUpdate,
)
from app.core.security.password import get_password_hash, verify_password
from app.services.audit_service import create_audit_log, AuditActionType

router = APIRouter()


@router.get("/", response_model=BuyerProfileResponse)
async def get_my_profile(db: AsyncSession = Depends(get_db), buyer=Depends(get_current_buyer)):
    """
    Get the authenticated buyer's profile information
    """
    result = await db.execute(
        select(BuyerProfile).where(
            BuyerProfile.customer_id == buyer.id,
            BuyerProfile.tenant_id == buyer.tenant_id,
        )
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        # Create default profile if not found
        profile = BuyerProfile(
            customer_id=buyer.id,
            tenant_id=buyer.tenant_id,
            first_name=getattr(buyer, "first_name", None),
            last_name=getattr(buyer, "last_name", None),
            email=getattr(buyer, "email", None),
            phone_number=getattr(buyer, "phone", None),
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    
    return profile


@router.patch("/", response_model=BuyerProfileResponse)
async def update_my_profile(
    profile_update: BuyerProfileUpdate,
    db: AsyncSession = Depends(get_db),
    buyer=Depends(get_current_buyer),
):
    """
    Update the authenticated buyer's profile information
    """
    result = await db.execute(
        select(BuyerProfile).where(
            BuyerProfile.customer_id == buyer.id,
            BuyerProfile.tenant_id == buyer.tenant_id,
        )
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    
    # Update profile fields
    for field, value in profile_update.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    
    await db.commit()
    await db.refresh(profile)
    
    # Create audit log
    await create_audit_log(
        db, 
        tenant_id=buyer.tenant_id,
        action_type=AuditActionType.update,
        entity_type="buyer_profile",
        entity_id=str(profile.id),
        actor_id=str(buyer.id),
        details={"updated_fields": list(profile_update.model_dump(exclude_unset=True).keys())}
    )
    
    return profile


@router.patch("/security", response_model=BuyerProfileResponse)
async def update_security_settings(
    security_update: SecuritySettingsUpdate,
    db: AsyncSession = Depends(get_db),
    buyer=Depends(get_current_buyer),
):
    """
    Update security settings (password, 2FA, etc.)
    """
    result = await db.execute(
        select(BuyerProfile).where(
            BuyerProfile.customer_id == buyer.id,
            BuyerProfile.tenant_id == buyer.tenant_id,
        )
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    
    # Handle password update if provided
    if security_update.current_password and security_update.new_password:
        # Verify current password
        if not verify_password(security_update.current_password, profile.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password"
            )
        
        # Update password hash
        profile.password_hash = get_password_hash(security_update.new_password)
    
    # Update other security settings
    if security_update.two_factor_enabled is not None:
        profile.two_factor_enabled = security_update.two_factor_enabled
    
    if security_update.recovery_email is not None:
        profile.recovery_email = security_update.recovery_email
    
    await db.commit()
    await db.refresh(profile)
    
    # Create audit log for security update
    await create_audit_log(
        db, 
        tenant_id=buyer.tenant_id,
        action_type=AuditActionType.update,
        entity_type="buyer_profile",
        entity_id=str(profile.id),
        actor_id=str(buyer.id),
        details={"security_settings_updated": True}
    )
    
    return profile
