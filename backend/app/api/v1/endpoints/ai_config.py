import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_current_user
from backend.app.models.ai_config import AIConfig
from backend.app.models.user import User
from backend.app.schemas.ai_config import AIConfigCreate, AIConfigResponse, AIConfigUpdate
from backend.app.services.audit_service import AuditActionType, AuditResourceType, create_audit_log

router = APIRouter()


@router.post("/{tenant_id}/ai-config", response_model=AIConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_ai_config(
    tenant_id: uuid.UUID = Path(...),
    ai_config_data: AIConfigCreate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create AI configuration for a tenant.

    This endpoint allows merchants to configure AI chatbot behavior including
    style/tone, auto-reply settings, active hours, and bot name.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        # Check if AI config already exists for this tenant
        existing_config = db.query(AIConfig).filter(
            AIConfig.tenant_id == tenant_id
        ).first()

        if existing_config:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="AI configuration already exists for this tenant"
            )

        # Create new AI config
        ai_config = AIConfig(
            tenant_id=tenant_id,
            style_tone=ai_config_data.style_tone,
            auto_reply_enabled=ai_config_data.auto_reply_enabled,
            active_hours=ai_config_data.active_hours,
            bot_name=ai_config_data.bot_name,
        )

        db.add(ai_config)
        db.commit()
        db.refresh(ai_config)

        # Create audit log
        create_audit_log(
            db=db,
            user_id=user_id,
            action=AuditActionType.CREATE,
            resource_type=AuditResourceType.AI_CONFIG,
            resource_id=str(ai_config.id),
            details={
                "tenant_id": str(tenant_id),
                "style_tone": ai_config_data.style_tone,
                "auto_reply_enabled": ai_config_data.auto_reply_enabled,
                "bot_name": ai_config_data.bot_name,
            },
        )

        return ai_config
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create AI configuration: {str(e)}",
        )


@router.get("/{tenant_id}/ai-config", response_model=AIConfigResponse)
async def get_ai_config(
    tenant_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get AI configuration for a tenant.
    """
    try:
        ai_config = db.query(AIConfig).filter(
            AIConfig.tenant_id == tenant_id
        ).first()

        if not ai_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AI configuration not found for this tenant"
            )

        return ai_config
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI configuration: {str(e)}",
        )


@router.put("/{tenant_id}/ai-config", response_model=AIConfigResponse)
async def update_ai_config(
    tenant_id: uuid.UUID = Path(...),
    ai_config_data: AIConfigUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update AI configuration for a tenant.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        ai_config = db.query(AIConfig).filter(
            AIConfig.tenant_id == tenant_id
        ).first()

        if not ai_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AI configuration not found for this tenant"
            )

        # Update fields if provided
        if ai_config_data.style_tone is not None:
            ai_config.style_tone = ai_config_data.style_tone
        if ai_config_data.auto_reply_enabled is not None:
            ai_config.auto_reply_enabled = ai_config_data.auto_reply_enabled
        if ai_config_data.active_hours is not None:
            ai_config.active_hours = ai_config_data.active_hours
        if ai_config_data.bot_name is not None:
            ai_config.bot_name = ai_config_data.bot_name

        db.commit()
        db.refresh(ai_config)

        # Create audit log
        create_audit_log(
            db=db,
            user_id=user_id,
            action=AuditActionType.UPDATE,
            resource_type=AuditResourceType.AI_CONFIG,
            resource_id=str(ai_config.id),
            details={
                "tenant_id": str(tenant_id),
                "updated_fields": ai_config_data.dict(exclude_unset=True),
            },
        )

        return ai_config
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update AI configuration: {str(e)}",
        )


@router.delete("/{tenant_id}/ai-config", response_model=Dict[str, Any])
async def delete_ai_config(
    tenant_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete AI configuration for a tenant.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        ai_config = db.query(AIConfig).filter(
            AIConfig.tenant_id == tenant_id
        ).first()

        if not ai_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AI configuration not found for this tenant"
            )

        # Store config details for audit log
        config_details = {
            "style_tone": ai_config.style_tone,
            "auto_reply_enabled": ai_config.auto_reply_enabled,
            "bot_name": ai_config.bot_name,
        }

        db.delete(ai_config)
        db.commit()

        # Create audit log
        create_audit_log(
            db=db,
            user_id=user_id,
            action=AuditActionType.DELETE,
            resource_type=AuditResourceType.AI_CONFIG,
            resource_id=str(ai_config.id),
            details={
                "tenant_id": str(tenant_id),
                "deleted_config": config_details,
            },
        )

        return {
            "success": True,
            "message": "AI configuration deleted successfully",
            "tenant_id": str(tenant_id),
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete AI configuration: {str(e)}",
        )


@router.get("/{tenant_id}/ai-config/status", response_model=Dict[str, Any])
async def get_ai_config_status(
    tenant_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get AI configuration status and summary for a tenant.
    """
    try:
        ai_config = db.query(AIConfig).filter(
            AIConfig.tenant_id == tenant_id
        ).first()

        if not ai_config:
            return {
                "configured": False,
                "message": "AI configuration not found",
                "tenant_id": str(tenant_id),
            }

        return {
            "configured": True,
            "auto_reply_enabled": ai_config.auto_reply_enabled,
            "bot_name": ai_config.bot_name,
            "style_tone": ai_config.style_tone,
            "active_hours": ai_config.active_hours,
            "last_updated": ai_config.updated_at.isoformat(),
            "tenant_id": str(tenant_id),
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI configuration status: {str(e)}",
        )
