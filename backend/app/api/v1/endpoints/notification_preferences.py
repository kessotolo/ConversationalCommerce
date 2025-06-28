import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_buyer
from app.models.notification_preferences import NotificationPreferences as NotificationPreferencesModel
from app.schemas.notification_preferences import (
    NotificationPreferencesBase, NotificationPreferencesUpdate, NotificationPreferencesResponse
)

router = APIRouter()


@router.get("/", response_model=NotificationPreferencesResponse)
def get_my_notification_preferences(db: Session = Depends(get_db), buyer=Depends(get_current_buyer)):
    prefs = db.query(NotificationPreferencesModel).filter(
        NotificationPreferencesModel.customer_id == buyer.id,
        NotificationPreferencesModel.tenant_id == buyer.tenant_id
    ).first()
    if not prefs:
        # Create default preferences if not found
        prefs = NotificationPreferencesModel(
            customer_id=buyer.id,
            tenant_id=buyer.tenant_id,
            email_enabled=True,
            sms_enabled=False,
            whatsapp_enabled=False,
            push_enabled=False
        )
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


@router.patch("/", response_model=NotificationPreferencesResponse)
def update_my_notification_preferences(
    prefs_in: NotificationPreferencesUpdate,
    db: Session = Depends(get_db),
    buyer=Depends(get_current_buyer)
):
    prefs = db.query(NotificationPreferencesModel).filter(
        NotificationPreferencesModel.customer_id == buyer.id,
        NotificationPreferencesModel.tenant_id == buyer.tenant_id
    ).first()
    if not prefs:
        raise HTTPException(
            status_code=404, detail="Notification preferences not found")
    for field, value in prefs_in.dict(exclude_unset=True).items():
        setattr(prefs, field, value)
    db.commit()
    db.refresh(prefs)
    return prefs


@router.delete("/{prefs_id}", status_code=204)
def delete_notification_preferences(prefs_id: uuid.UUID, db: Session = Depends(get_db)):
    prefs = db.query(NotificationPreferencesModel).filter(
        NotificationPreferencesModel.id == prefs_id).first()
    if not prefs:
        raise HTTPException(
            status_code=404, detail="Notification preferences not found")
    db.delete(prefs)
    db.commit()
    return None
