import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.storefront_banner import BannerStatus, BannerType
from app.models.user import User
from app.schemas.storefront_banner import (
    BannerCreate,
    BannerList,
    BannerOrderUpdate,
    BannerResponse,
    BannerUpdate,
)
from app.services.banner import banner_orchestrator

router = APIRouter()


@router.post(
    "/{tenant_id}/banners",
    response_model=BannerResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_banner(
    tenant_id: uuid.UUID = Path(...),
    banner_data: BannerCreate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a new banner for a storefront.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        banner = await banner_orchestrator.orchestrate_create_banner(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            data=banner_data.dict(),
        )

        return banner
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create banner: {str(e)}",
        )


@router.get("/{tenant_id}/banners", response_model=BannerList)
async def list_banners(
    tenant_id: uuid.UUID = Path(...),
    status: Optional[BannerStatus] = Query(None),
    banner_type: Optional[BannerType] = Query(None),
    include_expired: bool = Query(False),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    List banners for a tenant with filtering.
    """
    try:
        banners, total = await banner_orchestrator.list_banners(
            db=db,
            tenant_id=tenant_id,
            status=status,
            banner_type=banner_type,
            include_expired=include_expired,
            limit=limit,
            offset=offset,
        )

        return {"items": banners, "total": total, "offset": offset, "limit": limit}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list banners: {str(e)}",
        )


@router.get("/{tenant_id}/banners/{banner_id}", response_model=BannerResponse)
async def get_banner(
    tenant_id: uuid.UUID = Path(...),
    banner_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get a specific banner by ID.
    """
    try:
        banner = await banner_orchestrator.get_banner(
            db=db, tenant_id=tenant_id, banner_id=banner_id
        )

        if not banner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Banner not found"
            )

        return banner
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get banner: {str(e)}",
        )


@router.put("/{tenant_id}/banners/{banner_id}", response_model=BannerResponse)
async def update_banner(
    tenant_id: uuid.UUID = Path(...),
    banner_id: uuid.UUID = Path(...),
    banner_data: BannerUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update an existing banner.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        banner = await banner_orchestrator.update_banner(
            db=db,
            tenant_id=tenant_id,
            banner_id=banner_id,
            user_id=user_id,
            **banner_data.dict(),
        )

        return banner
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update banner: {str(e)}",
        )


@router.delete("/{tenant_id}/banners/{banner_id}", response_model=Dict[str, Any])
async def delete_banner(
    tenant_id: uuid.UUID = Path(...),
    banner_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete a banner.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        deleted = await banner_orchestrator.delete_banner(
            db=db, tenant_id=tenant_id, banner_id=banner_id, user_id=user_id
        )

        return {
            "success": deleted,
            "message": (
                "Banner deleted successfully"
                if deleted
                else "Banner not found or already deleted"
            ),
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete banner: {str(e)}",
        )


@router.put("/{tenant_id}/banners/{banner_id}/publish", response_model=BannerResponse)
async def publish_banner(
    tenant_id: uuid.UUID = Path(...),
    banner_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Publish a banner.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        banner = await banner_orchestrator.orchestrate_publish_banner(
            db=db, tenant_id=tenant_id, banner_id=banner_id, user_id=user_id
        )

        return banner
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish banner: {str(e)}",
        )


@router.put("/{tenant_id}/banners/order", response_model=List[BannerResponse])
async def reorder_banners(
    tenant_id: uuid.UUID = Path(...),
    banner_order: List[BannerOrderUpdate] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Reorder multiple banners.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        # Convert to format expected by service
        order_data = [
            {"banner_id": str(item.banner_id),
             "display_order": item.display_order}
            for item in banner_order
        ]

        banners = await banner_orchestrator.orchestrate_reorder_banners(
            db=db, tenant_id=tenant_id, user_id=user_id, banner_order=order_data
        )

        return banners
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reorder banners: {str(e)}",
        )
