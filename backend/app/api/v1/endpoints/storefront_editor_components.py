import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.app.api.deps import get_current_active_user, get_db
from app.app.models.storefront_component import ComponentStatus, ComponentType
from app.app.models.storefront_page_template import PageTemplateType, TemplateStatus
from app.app.models.user import User
from app.app.schemas.storefront_component import (
    ComponentCreate,
    ComponentList,
    ComponentResponse,
    ComponentUpdate,
    ComponentUsageResponse,
)
from app.app.schemas.storefront_page_template import (
    LayoutUpdate,
    PageTemplateCreate,
    PageTemplateList,
    PageTemplateResponse,
    PageTemplateUpdate,
)
from app.app.services import storefront_component_service, storefront_page_template_service

router = APIRouter()

# Component Endpoints


@router.post(
    "/{tenant_id}/components",
    response_model=ComponentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_component(
    tenant_id: uuid.UUID = Path(...),
    component_data: ComponentCreate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a new reusable UI component.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        component = await storefront_component_service.create_component(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            name=component_data.name,
            component_type=component_data.component_type,
            configuration=component_data.configuration,
            description=component_data.description,
            is_global=component_data.is_global,
            tags=component_data.tags,
            status=component_data.status,
        )

        return component
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create component: {str(e)}",
        )


@router.get("/{tenant_id}/components", response_model=ComponentList)
async def list_components(
    tenant_id: uuid.UUID = Path(...),
    component_type: Optional[ComponentType] = Query(None),
    status: Optional[ComponentStatus] = Query(None),
    tags: Optional[List[str]] = Query(None),
    search_query: Optional[str] = Query(None),
    only_global: bool = Query(False),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    List components for a tenant with filtering.
    """
    try:
        components, total = await storefront_component_service.list_components(
            db=db,
            tenant_id=tenant_id,
            component_type=component_type,
            status=status,
            tags=tags,
            search_query=search_query,
            only_global=only_global,
            limit=limit,
            offset=offset,
        )

        return {"items": components, "total": total, "offset": offset, "limit": limit}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list components: {str(e)}",
        )


@router.get("/{tenant_id}/components/{component_id}", response_model=ComponentResponse)
async def get_component(
    tenant_id: uuid.UUID = Path(...),
    component_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get a specific component by ID.
    """
    try:
        component = await storefront_component_service.get_component(
            db=db, tenant_id=tenant_id, component_id=component_id
        )

        if not component:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Component not found"
            )

        return component
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get component: {str(e)}",
        )


@router.put("/{tenant_id}/components/{component_id}", response_model=ComponentResponse)
async def update_component(
    tenant_id: uuid.UUID = Path(...),
    component_id: uuid.UUID = Path(...),
    component_data: ComponentUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update an existing component.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        component = await storefront_component_service.update_component(
            db=db,
            tenant_id=tenant_id,
            component_id=component_id,
            user_id=user_id,
            name=component_data.name,
            configuration=component_data.configuration,
            description=component_data.description,
            is_global=component_data.is_global,
            tags=component_data.tags,
            status=component_data.status,
        )

        return component
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update component: {str(e)}",
        )


@router.delete("/{tenant_id}/components/{component_id}", response_model=Dict[str, Any])
async def delete_component(
    tenant_id: uuid.UUID = Path(...),
    component_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete a component.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        deleted = await storefront_component_service.delete_component(
            db=db, tenant_id=tenant_id, component_id=component_id, user_id=user_id
        )

        return {
            "success": deleted,
            "message": (
                "Component deleted successfully"
                if deleted
                else "Component not found or already deleted"
            ),
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete component: {str(e)}",
        )


@router.put(
    "/{tenant_id}/components/{component_id}/publish", response_model=ComponentResponse
)
async def publish_component(
    tenant_id: uuid.UUID = Path(...),
    component_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Publish a component.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        component = await storefront_component_service.publish_component(
            db=db, tenant_id=tenant_id, component_id=component_id, user_id=user_id
        )

        return component
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish component: {str(e)}",
        )


@router.post(
    "/{tenant_id}/components/{component_id}/duplicate", response_model=ComponentResponse
)
async def duplicate_component(
    tenant_id: uuid.UUID = Path(...),
    component_id: uuid.UUID = Path(...),
    new_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Duplicate an existing component.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        component = await storefront_component_service.duplicate_component(
            db=db,
            tenant_id=tenant_id,
            component_id=component_id,
            user_id=user_id,
            new_name=new_name,
        )

        return component
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to duplicate component: {str(e)}",
        )


@router.get(
    "/{tenant_id}/components/{component_id}/usage",
    response_model=ComponentUsageResponse,
)
async def get_component_usage(
    tenant_id: uuid.UUID = Path(...),
    component_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get information about where a component is being used.
    """
    try:
        usage = await storefront_component_service.get_component_usage(
            db=db, tenant_id=tenant_id, component_id=component_id
        )

        return {"component_id": str(component_id), "usage_locations": usage}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get component usage: {str(e)}",
        )


# Page Template Endpoints


@router.post(
    "/{tenant_id}/page-templates",
    response_model=PageTemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_page_template(
    tenant_id: uuid.UUID = Path(...),
    template_data: PageTemplateCreate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a new page template.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        template = await storefront_page_template_service.create_page_template(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            name=template_data.name,
            template_type=template_data.template_type,
            structure=template_data.structure,
            description=template_data.description,
            is_default=template_data.is_default,
            tags=template_data.tags,
            status=template_data.status,
        )

        return template
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create page template: {str(e)}",
        )


@router.get("/{tenant_id}/page-templates", response_model=PageTemplateList)
async def list_page_templates(
    tenant_id: uuid.UUID = Path(...),
    template_type: Optional[PageTemplateType] = Query(None),
    status: Optional[TemplateStatus] = Query(None),
    tags: Optional[List[str]] = Query(None),
    search_query: Optional[str] = Query(None),
    only_defaults: bool = Query(False),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    List page templates for a tenant with filtering.
    """
    try:
        templates, total = await storefront_page_template_service.list_page_templates(
            db=db,
            tenant_id=tenant_id,
            template_type=template_type,
            status=status,
            tags=tags,
            search_query=search_query,
            only_defaults=only_defaults,
            limit=limit,
            offset=offset,
        )

        return {"items": templates, "total": total, "offset": offset, "limit": limit}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list page templates: {str(e)}",
        )


@router.get(
    "/{tenant_id}/page-templates/{template_id}", response_model=PageTemplateResponse
)
async def get_page_template(
    tenant_id: uuid.UUID = Path(...),
    template_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get a specific page template by ID.
    """
    try:
        template = await storefront_page_template_service.get_page_template(
            db=db, tenant_id=tenant_id, template_id=template_id
        )

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Page template not found"
            )

        return template
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get page template: {str(e)}",
        )


@router.put(
    "/{tenant_id}/page-templates/{template_id}", response_model=PageTemplateResponse
)
async def update_page_template(
    tenant_id: uuid.UUID = Path(...),
    template_id: uuid.UUID = Path(...),
    template_data: PageTemplateUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update an existing page template.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        template = await storefront_page_template_service.update_page_template(
            db=db,
            tenant_id=tenant_id,
            template_id=template_id,
            user_id=user_id,
            name=template_data.name,
            structure=template_data.structure,
            description=template_data.description,
            is_default=template_data.is_default,
            tags=template_data.tags,
            status=template_data.status,
        )

        return template
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update page template: {str(e)}",
        )


@router.delete(
    "/{tenant_id}/page-templates/{template_id}", response_model=Dict[str, Any]
)
async def delete_page_template(
    tenant_id: uuid.UUID = Path(...),
    template_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete a page template.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        deleted = await storefront_page_template_service.delete_page_template(
            db=db, tenant_id=tenant_id, template_id=template_id, user_id=user_id
        )

        return {
            "success": deleted,
            "message": (
                "Page template deleted successfully"
                if deleted
                else "Page template not found or already deleted"
            ),
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete page template: {str(e)}",
        )


@router.put(
    "/{tenant_id}/page-templates/{template_id}/publish",
    response_model=PageTemplateResponse,
)
async def publish_page_template(
    tenant_id: uuid.UUID = Path(...),
    template_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Publish a page template.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        template = await storefront_page_template_service.publish_page_template(
            db=db, tenant_id=tenant_id, template_id=template_id, user_id=user_id
        )

        return template
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish page template: {str(e)}",
        )


@router.post(
    "/{tenant_id}/page-templates/{template_id}/duplicate",
    response_model=PageTemplateResponse,
)
async def duplicate_page_template(
    tenant_id: uuid.UUID = Path(...),
    template_id: uuid.UUID = Path(...),
    new_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Duplicate an existing page template.
    """
    # Convert current_user.id to UUID if it's a string
    user_id = (
        current_user.id
        if isinstance(current_user.id, uuid.UUID)
        else uuid.UUID(current_user.id)
    )

    try:
        template = await storefront_page_template_service.duplicate_page_template(
            db=db,
            tenant_id=tenant_id,
            template_id=template_id,
            user_id=user_id,
            new_name=new_name,
        )

        return template
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to duplicate page template: {str(e)}",
        )


@router.get(
    "/{tenant_id}/page-templates/default/{template_type}",
    response_model=Optional[PageTemplateResponse],
)
async def get_default_template(
    tenant_id: uuid.UUID = Path(...),
    template_type: PageTemplateType = Path(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get the default template for a specific page type.
    """
    try:
        template = await storefront_page_template_service.get_default_template(
            db=db, tenant_id=tenant_id, template_type=template_type
        )

        return template
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get default template: {str(e)}",
        )


# Page Layout Endpoints moved to storefront_page_layout.py
# These endpoints now use proper authorization and auditing via PageLayoutOrchestrator
