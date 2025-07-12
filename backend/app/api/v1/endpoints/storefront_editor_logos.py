import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_active_user, get_db
from backend.app.models.storefront_logo import LogoStatus, LogoType
from backend.app.models.user import User
from backend.app.schemas.storefront_logo import LogoCreate, LogoList, LogoResponse, LogoUpdate
from backend.app.services import storefront_logo_service

router = APIRouter()


@router.post(
    "/{tenant_id}/logos",
    response_model=LogoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_logo(
    tenant_id: uuid.UUID = Path(...),
    logo_data: LogoCreate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a new logo for a storefront.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        logo = await storefront_logo_service.create_logo(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            name=logo_data.name,
            logo_type=logo_data.logo_type,
            asset_id=logo_data.asset_id,
            display_settings=logo_data.display_settings,
            responsive_settings=logo_data.responsive_settings,
            start_date=logo_data.start_date,
            end_date=logo_data.end_date,
            status=logo_data.status,
        )

        return logo
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create logo: {str(e)}",
        )


@router.get("/{tenant_id}/logos", response_model=LogoList)
async def list_logos(
    tenant_id: uuid.UUID = Path(...),
    logo_type: Optional[LogoType] = Query(None),
    status: Optional[LogoStatus] = Query(None),
    include_expired: bool = Query(False),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    List logos for a tenant with filtering.
    """
    try:
        logos, total = await storefront_logo_service.list_logos(
            db=db,
            tenant_id=tenant_id,
            logo_type=logo_type,
            status=status,
            include_expired=include_expired,
            limit=limit,
            offset=offset,
        )

        return {"items": logos, "total": total, "offset": offset, "limit": limit}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list logos: {str(e)}",
        )


@router.get("/{tenant_id}/logos/{logo_id}", response_model=LogoResponse)
async def get_logo(
    tenant_id: uuid.UUID = Path(...),
    logo_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get a specific logo by ID.
    """
    try:
        logo = await storefront_logo_service.get_logo(
            db=db, tenant_id=tenant_id, logo_id=logo_id
        )

        if not logo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Logo not found"
            )

        return logo
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get logo: {str(e)}",
        )


@router.put("/{tenant_id}/logos/{logo_id}", response_model=LogoResponse)
async def update_logo(
    tenant_id: uuid.UUID = Path(...),
    logo_id: uuid.UUID = Path(...),
    logo_data: LogoUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update an existing logo.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        logo = await storefront_logo_service.update_logo(
            db=db,
            tenant_id=tenant_id,
            logo_id=logo_id,
            user_id=user_id,
            name=logo_data.name,
            logo_type=logo_data.logo_type,
            asset_id=logo_data.asset_id,
            display_settings=logo_data.display_settings,
            responsive_settings=logo_data.responsive_settings,
            start_date=logo_data.start_date,
            end_date=logo_data.end_date,
            status=logo_data.status,
        )

        return logo
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update logo: {str(e)}",
        )


@router.delete("/{tenant_id}/logos/{logo_id}", response_model=Dict[str, Any])
async def delete_logo(
    tenant_id: uuid.UUID = Path(...),
    logo_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete a logo.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        deleted = await storefront_logo_service.delete_logo(
            db=db, tenant_id=tenant_id, logo_id=logo_id, user_id=user_id
        )

        return {
            "success": deleted,
            "message": (
                "Logo deleted successfully"
                if deleted
                else "Logo not found or already deleted"
            ),
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete logo: {str(e)}",
        )


@router.put("/{tenant_id}/logos/{logo_id}/publish", response_model=LogoResponse)
async def publish_logo(
    tenant_id: uuid.UUID = Path(...),
    logo_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Publish a logo.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        logo = await storefront_logo_service.publish_logo(
            db=db, tenant_id=tenant_id, logo_id=logo_id, user_id=user_id
        )

        return logo
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish logo: {str(e)}",
        )


@router.get(
    "/{tenant_id}/logos/active/{logo_type}", response_model=Optional[LogoResponse]
)
async def get_active_logo(
    tenant_id: uuid.UUID = Path(...),
    logo_type: LogoType = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get the currently active logo of a specific type.
    """
    try:
        logo = await storefront_logo_service.get_active_logo(
            db=db, tenant_id=tenant_id, logo_type=logo_type
        )

        return logo
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get active logo: {str(e)}",
        )
