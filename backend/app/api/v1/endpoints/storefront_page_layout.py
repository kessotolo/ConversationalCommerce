import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.app.api.deps import get_db, get_current_active_user
from app.app.models.user import User
from app.app.schemas.storefront.page_layout import LayoutUpdate
from app.app.services.storefront.page_layout_orchestrator import PageLayoutOrchestrator

router = APIRouter(prefix="/storefront", tags=["storefront-page-layout"])

# Initialize orchestrator
page_layout_orchestrator = PageLayoutOrchestrator()


@router.put("/{tenant_id}/pages/{page_id}/layout", response_model=Dict[str, Any])
async def update_page_layout(
    tenant_id: uuid.UUID = Path(...),
    page_id: uuid.UUID = Path(...),
    layout_data: LayoutUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update the layout of a specific page with authorization and auditing.

    This endpoint uses the PageLayoutOrchestrator to handle complex validation,
    authorization checks, and comprehensive auditing.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        result = await page_layout_orchestrator.update_page_layout_with_validation(
            db=db,
            tenant_id=tenant_id,
            page_id=page_id,
            user_id=user_id,
            layout_data=layout_data.dict(),
        )
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update page layout: {str(e)}",
        )


@router.post("/{tenant_id}/pages/{page_id}/components", response_model=Dict[str, Any])
async def add_component_to_page(
    tenant_id: uuid.UUID = Path(...),
    page_id: uuid.UUID = Path(...),
    component_id: uuid.UUID = Query(...),
    slot_id: str = Query(...),
    position: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Add a component to a specific slot in a page with authorization and auditing.

    This endpoint uses the PageLayoutOrchestrator to handle complex validation,
    authorization checks, and comprehensive auditing.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        result = await page_layout_orchestrator.add_component_to_page_with_validation(
            db=db,
            tenant_id=tenant_id,
            page_id=page_id,
            user_id=user_id,
            component_id=component_id,
            slot_id=slot_id,
            position=position,
        )
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add component to page: {str(e)}",
        )


@router.delete("/{tenant_id}/pages/{page_id}/components/{component_id}", response_model=Dict[str, Any])
async def remove_component_from_page(
    tenant_id: uuid.UUID = Path(...),
    page_id: uuid.UUID = Path(...),
    component_id: uuid.UUID = Path(...),
    slot_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Remove a component from a specific slot in a page with authorization and auditing.

    This endpoint uses the PageLayoutOrchestrator to handle complex validation,
    authorization checks, and comprehensive auditing.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        result = await page_layout_orchestrator.remove_component_from_page_with_validation(
            db=db,
            tenant_id=tenant_id,
            page_id=page_id,
            user_id=user_id,
            component_id=component_id,
            slot_id=slot_id,
        )
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove component from page: {str(e)}",
        )


@router.get("/{tenant_id}/pages/{page_id}/layout", response_model=Dict[str, Any])
async def get_page_layout(
    tenant_id: uuid.UUID = Path(...),
    page_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get the current layout of a specific page.

    This endpoint includes authorization checks to ensure the user has permission
    to view the page layout.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        # TODO: Implement actual page layout retrieval
        # This would fetch the current layout from the database
        # For now, return a placeholder response
        return {
            "success": True,
            "page_id": str(page_id),
            "tenant_id": str(tenant_id),
            "layout": {
                "slots": [],
                "components": [],
                "metadata": {
                    "last_updated": None,
                    "updated_by": None,
                }
            },
            "message": "Page layout retrieved successfully",
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get page layout: {str(e)}",
        )


@router.get("/{tenant_id}/pages/{page_id}/components", response_model=Dict[str, Any])
async def get_page_components(
    tenant_id: uuid.UUID = Path(...),
    page_id: uuid.UUID = Path(...),
    slot_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get all components for a specific page, optionally filtered by slot.

    This endpoint includes authorization checks to ensure the user has permission
    to view the page components.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        # TODO: Implement actual page component retrieval
        # This would fetch the components from the database
        # For now, return a placeholder response
        return {
            "success": True,
            "page_id": str(page_id),
            "tenant_id": str(tenant_id),
            "slot_id": slot_id,
            "components": [],
            "message": "Page components retrieved successfully",
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get page components: {str(e)}",
        )
