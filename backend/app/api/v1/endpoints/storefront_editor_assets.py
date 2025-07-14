import uuid
from typing import Any, Dict, Optional

from fastapi import (
    APIRouter,
    Body,
    Depends,
    File,
    Form,
    HTTPException,
    Path,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.storefront_asset import AssetType
from app.models.user import User
from app.schemas.storefront_asset import AssetList, AssetResponse, AssetUpdateRequest
from app.services import storefront_asset_service

router = APIRouter()


@router.post(
    "/{tenant_id}/assets",
    response_model=AssetResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_asset(
    tenant_id: uuid.UUID = Path(...),
    file: UploadFile = File(...),
    asset_type: Optional[AssetType] = Form(None),
    title: Optional[str] = Form(None),
    alt_text: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Upload a new asset for the storefront.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        # If title not provided, use filename
        if not title:
            title = file.filename

        asset = await storefront_asset_service.upload_asset(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            file=file,
            asset_type=asset_type,
            title=title,
            alt_text=alt_text,
            description=description,
        )

        return asset
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload asset: {str(e)}",
        )


@router.get("/{tenant_id}/assets", response_model=AssetList)
async def list_assets(
    tenant_id: uuid.UUID = Path(...),
    asset_type: Optional[AssetType] = Query(None),
    search_query: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    sort_by: str = Query(
        "created_at", description="Field to sort by (created_at, file_size, title)"
    ),
    sort_desc: bool = Query(True, description="Sort in descending order if true"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    List assets for a tenant with filtering and sorting.
    """
    try:
        assets, total = await storefront_asset_service.get_assets(
            db=db,
            tenant_id=tenant_id,
            asset_type=asset_type,
            search_query=search_query,
            limit=limit,
            offset=offset,
            sort_by=sort_by,
            sort_desc=sort_desc,
        )

        return {"items": assets, "total": total, "offset": offset, "limit": limit}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list assets: {str(e)}",
        )


@router.get("/{tenant_id}/assets/{asset_id}", response_model=AssetResponse)
async def get_asset(
    tenant_id: uuid.UUID = Path(...),
    asset_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get a specific asset by ID.
    """
    try:
        asset = await storefront_asset_service.get_asset(
            db=db, tenant_id=tenant_id, asset_id=asset_id
        )

        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found"
            )

        return asset
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get asset: {str(e)}",
        )


@router.put("/{tenant_id}/assets/{asset_id}", response_model=AssetResponse)
async def update_asset(
    tenant_id: uuid.UUID = Path(...),
    asset_id: uuid.UUID = Path(...),
    asset_data: AssetUpdateRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update asset metadata.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        asset = await storefront_asset_service.update_asset(
            db=db,
            tenant_id=tenant_id,
            asset_id=asset_id,
            user_id=user_id,
            title=asset_data.title,
            alt_text=asset_data.alt_text,
            description=asset_data.description,
            metadata=asset_data.metadata,
        )

        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found"
            )

        return asset
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update asset: {str(e)}",
        )


@router.delete("/{tenant_id}/assets/{asset_id}", response_model=Dict[str, Any])
async def delete_asset(
    tenant_id: uuid.UUID = Path(...),
    asset_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete an asset (soft delete).
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        deleted = await storefront_asset_service.delete_asset(
            db=db, tenant_id=tenant_id, asset_id=asset_id, user_id=user_id
        )

        return {
            "success": deleted,
            "message": (
                "Asset deleted successfully"
                if deleted
                else "Asset not found or already deleted"
            ),
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete asset: {str(e)}",
        )


@router.post("/{tenant_id}/assets/{asset_id}/optimize", response_model=AssetResponse)
async def optimize_image_asset(
    tenant_id: uuid.UUID = Path(...),
    asset_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Optimize an image asset by creating multiple resolutions.
    """
    try:
        asset = await storefront_asset_service.optimize_image(
            db=db, tenant_id=tenant_id, asset_id=asset_id
        )

        return asset
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to optimize image: {str(e)}",
        )
