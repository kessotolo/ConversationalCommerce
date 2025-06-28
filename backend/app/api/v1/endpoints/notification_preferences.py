import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_buyer
from app.models.notification_preferences import NotificationPreferences as NotificationPreferencesModel
from app.schemas.notification_preferences import (
    NotificationPreferencesUpdate, NotificationPreferencesResponse,
)

router = APIRouter()


@router.get("/", response_model=NotificationPreferencesResponse)
async def get_my_notification_preferences(db: AsyncSession = Depends(get_db), buyer=Depends(get_current_buyer)):
    result = await db.execute(
        select(NotificationPreferencesModel).where(
            NotificationPreferencesModel.customer_id == buyer.id,
            NotificationPreferencesModel.tenant_id == buyer.tenant_id,
        )
    )
    prefs = result.scalar_one_or_none()
    if not prefs:
        # Create default preferences if not found
        prefs = NotificationPreferencesModel(
            customer_id=buyer.id,
            tenant_id=buyer.tenant_id,
            email_enabled=True,
            sms_enabled=False,
            whatsapp_enabled=False,
            push_enabled=False,
        )
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)
    return prefs


@router.patch("/", response_model=NotificationPreferencesResponse)
async def update_my_notification_preferences(
    prefs_in: NotificationPreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    buyer=Depends(get_current_buyer),
):
    result = await db.execute(
        select(NotificationPreferencesModel).where(
            NotificationPreferencesModel.customer_id == buyer.id,
            NotificationPreferencesModel.tenant_id == buyer.tenant_id,
        )
    )
    prefs = result.scalar_one_or_none()
    if not prefs:
        raise HTTPException(
            status_code=404, detail="Notification preferences not found"
        )
    for field, value in prefs_in.model_dump(exclude_unset=True).items():
        setattr(prefs, field, value)
    await db.commit()
    await db.refresh(prefs)
    return prefs


@router.delete("/{prefs_id}", status_code=204)
async def delete_notification_preferences(
    prefs_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db),
):
    prefs = await db.get(NotificationPreferencesModel, prefs_id)
    if not prefs:
        raise HTTPException(
            status_code=404, detail="Notification preferences not found"
        )
    await db.delete(prefs)
    await db.commit()
    return None
