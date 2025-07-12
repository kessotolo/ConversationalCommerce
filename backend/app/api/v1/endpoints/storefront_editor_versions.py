import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_active_user, get_db
from backend.app.models.user import User
from backend.app.schemas.storefront_version import (
    StorefrontVersionList,
    StorefrontVersionResponse,
)
from backend.app.services import storefront_version_service

router = APIRouter()


@router.get("/{tenant_id}/versions", response_model=StorefrontVersionList)
async def list_storefront_versions(
    tenant_id: uuid.UUID = Path(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    tags: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    List all versions of a storefront configuration.

    Results are paginated and can be filtered by tags.
    """
    try:
        versions, total = await storefront_version_service.list_versions(
            db=db, tenant_id=tenant_id, limit=limit, offset=skip, tags=tags
        )

        return {"items": versions, "total": total, "skip": skip, "limit": limit}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list versions: {str(e)}",
        )


@router.get(
    "/{tenant_id}/versions/{version_id}", response_model=StorefrontVersionResponse
)
async def get_storefront_version(
    tenant_id: uuid.UUID = Path(...),
    version_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get a specific storefront version by ID.
    """
    try:
        version = await storefront_version_service.get_version(
            db=db, tenant_id=tenant_id, version_id=version_id
        )

        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Version not found"
            )

        return version
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get version: {str(e)}",
        )


@router.post(
    "/{tenant_id}/versions/{version_id}/restore", response_model=Dict[str, Any]
)
async def restore_storefront_version(
    tenant_id: uuid.UUID = Path(...),
    version_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Restore a storefront to a previous version.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        config = await storefront_version_service.restore_version(
            db=db, tenant_id=tenant_id, user_id=user_id, version_id=version_id
        )

        return {
            "success": True,
            "message": "Version restored successfully",
            "config_id": str(config.id),
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to restore version: {str(e)}",
        )


@router.get("/{tenant_id}/versions/compare", response_model=Dict[str, Any])
async def compare_storefront_versions(
    tenant_id: uuid.UUID = Path(...),
    v1: uuid.UUID = Query(..., description="First version ID to compare"),
    v2: uuid.UUID = Query(..., description="Second version ID to compare"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Compare two storefront versions and get the differences.
    """
    try:
        diff = await storefront_version_service.compare_versions(
            db=db, tenant_id=tenant_id, version_id1=v1, version_id2=v2
        )

        return {"differences": diff, "version1": str(v1), "version2": str(v2)}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compare versions: {str(e)}",
        )
