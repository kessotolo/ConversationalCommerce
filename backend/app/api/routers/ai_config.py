from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.ai_config import AIConfig
from app.schemas.ai_config import AIConfigResponse, AIConfigUpdate
from uuid import UUID

router = APIRouter()


@router.get("/ai-config", response_model=AIConfigResponse)
def get_ai_config(merchant_id: UUID, db: Session = Depends(get_db)):
    config = db.query(AIConfig).filter(
        AIConfig.merchant_id == merchant_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="AIConfig not found")
    return config


@router.put("/ai-config", response_model=AIConfigResponse)
def update_ai_config(merchant_id: UUID, update: AIConfigUpdate, db: Session = Depends(get_db)):
    config = db.query(AIConfig).filter(
        AIConfig.merchant_id == merchant_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="AIConfig not found")
    for field, value in update.dict(exclude_unset=True).items():
        setattr(config, field, value)
    db.commit()
    db.refresh(config)
    return config
