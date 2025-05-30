from fastapi import APIRouter, Depends, HTTPException, status, Path, Body, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime

from app.api.deps import get_db, get_current_user, get_current_active_user, get_current_active_superuser
from app.models.user import User
from app.schemas.storefront_draft import StorefrontDraftCreate, StorefrontDraftResponse, StorefrontDraftList
from app.services import storefront_service

router = APIRouter()


@router.post("/{tenant_id}/drafts", response_model=StorefrontDraftResponse, status_code=status.HTTP_201_CREATED)
async def create_storefront_draft(
    tenant_id: uuid.UUID = Path(...),
    draft_data: StorefrontDraftCreate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new storefront draft for editing.
    
    Only users with appropriate permissions can create drafts.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = current_user.id if isinstance(current_user.id, uuid.UUID) else uuid.UUID(current_user.id)
    
    try:
        draft = await storefront_service.create_draft(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            name=draft_data.name,
            description=draft_data.description,
            changes=draft_data.changes
        )
        return draft
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create draft: {str(e)}"
        )


@router.get("/{tenant_id}/drafts", response_model=StorefrontDraftList)
async def list_storefront_drafts(
    tenant_id: uuid.UUID = Path(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all drafts for a storefront.
    
    Results are paginated and can be filtered by status.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = current_user.id if isinstance(current_user.id, uuid.UUID) else uuid.UUID(current_user.id)
    
    try:
        drafts, total = await storefront_service.list_drafts(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            skip=skip,
            limit=limit
        )
        
        return {
            "items": drafts,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list drafts: {str(e)}"
        )


@router.get("/{tenant_id}/drafts/{draft_id}", response_model=StorefrontDraftResponse)
async def get_storefront_draft(
    tenant_id: uuid.UUID = Path(...),
    draft_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific storefront draft by ID.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = current_user.id if isinstance(current_user.id, uuid.UUID) else uuid.UUID(current_user.id)
    
    try:
        draft = await storefront_service.get_draft(
            db=db,
            tenant_id=tenant_id,
            draft_id=draft_id,
            user_id=user_id
        )
        
        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Draft not found"
            )
        
        return draft
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get draft: {str(e)}"
        )


@router.put("/{tenant_id}/drafts/{draft_id}", response_model=StorefrontDraftResponse)
async def update_storefront_draft(
    tenant_id: uuid.UUID = Path(...),
    draft_id: uuid.UUID = Path(...),
    draft_data: StorefrontDraftCreate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an existing storefront draft.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = current_user.id if isinstance(current_user.id, uuid.UUID) else uuid.UUID(current_user.id)
    
    try:
        draft = await storefront_service.update_draft(
            db=db,
            tenant_id=tenant_id,
            draft_id=draft_id,
            user_id=user_id,
            name=draft_data.name,
            description=draft_data.description,
            changes=draft_data.changes
        )
        
        return draft
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update draft: {str(e)}"
        )


@router.put("/{tenant_id}/drafts/{draft_id}/publish", response_model=Dict[str, Any])
async def publish_storefront_draft(
    tenant_id: uuid.UUID = Path(...),
    draft_id: uuid.UUID = Path(...),
    schedule_time: Optional[datetime] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Publish a draft to make changes live.
    
    Optionally schedule the publish for a future date/time.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = current_user.id if isinstance(current_user.id, uuid.UUID) else uuid.UUID(current_user.id)
    
    try:
        result = await storefront_service.publish_draft(
            db=db,
            tenant_id=tenant_id,
            draft_id=draft_id,
            user_id=user_id,
            schedule_time=schedule_time
        )
        
        return {
            "success": True,
            "message": "Draft published successfully" if not schedule_time else "Draft scheduled for publishing",
            "version_id": str(result.get("version_id")) if result.get("version_id") else None,
            "published_at": result.get("published_at"),
            "scheduled_for": result.get("scheduled_for")
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish draft: {str(e)}"
        )


@router.delete("/{tenant_id}/drafts/{draft_id}", response_model=Dict[str, Any])
async def delete_storefront_draft(
    tenant_id: uuid.UUID = Path(...),
    draft_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a storefront draft.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = current_user.id if isinstance(current_user.id, uuid.UUID) else uuid.UUID(current_user.id)
    
    try:
        deleted = await storefront_service.delete_draft(
            db=db,
            tenant_id=tenant_id,
            draft_id=draft_id,
            user_id=user_id
        )
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Draft not found or already deleted"
            )
        
        return {
            "success": True,
            "message": "Draft deleted successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete draft: {str(e)}"
        )
