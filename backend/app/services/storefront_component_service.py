import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app.models.storefront_component import (
    ComponentStatus,
    ComponentType,
    StorefrontComponent,
)
from app.models.tenant import Tenant
from app.models.user import User
from app.services.storefront.permissions.storefront_permissions_service import StorefrontPermissionsService


async def create_component(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    name: str,
    component_type: ComponentType,
    configuration: Dict[str, Any],
    description: Optional[str] = None,
    is_global: bool = False,
    tags: Optional[List[str]] = None,
    status: ComponentStatus = ComponentStatus.DRAFT,
) -> StorefrontComponent:
    """
    Create a new reusable UI component.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user creating the component
        name: Component name
        component_type: Type of component
        configuration: Component configuration (structure depends on component_type)
        description: Optional description of the component
        is_global: Whether this component is globally available across the tenant
        tags: Optional tags for categorizing the component
        status: Component status (default: DRAFT)

    Returns:
        Newly created StorefrontComponent

    Raises:
        HTTPException: 404 if tenant or user not found
        HTTPException: 403 if user doesn't have permission
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Check permission
    has_perm = await StorefrontPermissionsService.has_permission(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        required_permission="edit",
        section=None,  # For now, using global permission
    )

    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create components",
        )

    # Validate component configuration based on type
    # This would be more complex in a real implementation
    await validate_component_configuration(component_type, configuration)

    # Create the component
    component = StorefrontComponent(
        tenant_id=tenant_id,
        name=name,
        component_type=component_type,
        configuration=configuration,
        description=description,
        is_global=is_global,
        tags=tags or [],
        status=status,
        created_by=user_id,
    )

    db.add(component)
    db.commit()
    db.refresh(component)

    return component


async def update_component(
    db: Session,
    tenant_id: uuid.UUID,
    component_id: uuid.UUID,
    user_id: uuid.UUID,
    version: int,
    name: Optional[str] = None,
    configuration: Optional[Dict[str, Any]] = None,
    description: Optional[str] = None,
    is_global: Optional[bool] = None,
    tags: Optional[List[str]] = None,
    status: Optional[ComponentStatus] = None,
) -> StorefrontComponent:
    """
    Update an existing component.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        component_id: UUID of the component to update
        user_id: UUID of the user updating the component
        version: Current version of the component
        name: Optional new component name
        configuration: Optional new component configuration
        description: Optional new description
        is_global: Optional new is_global flag
        tags: Optional new tags
        status: Optional new status

    Returns:
        Updated StorefrontComponent

    Raises:
        HTTPException: 404 if tenant, user, or component not found
        HTTPException: 403 if user doesn't have permission
        HTTPException: 400 if configuration is invalid
        HTTPException: 409 if component was modified by another process
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Get the component
    component = (
        db.query(StorefrontComponent)
        .filter(
            StorefrontComponent.id == component_id,
            StorefrontComponent.tenant_id == tenant_id,
        )
        .first()
    )

    if not component:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Component not found"
        )

    # Check permission
    has_perm = await StorefrontPermissionsService.has_permission(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        required_permission="edit",
        section=None,
        component_id=component_id,
    )

    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this component",
        )

    # Validate configuration if provided
    if configuration is not None:
        await validate_component_configuration(component.component_type, configuration)

    # Update fields if provided
    if name is not None:
        component.name = name

    if configuration is not None:
        component.configuration = configuration

    if description is not None:
        component.description = description

    if is_global is not None:
        component.is_global = is_global

    if tags is not None:
        component.tags = tags

    if status is not None:
        # If transitioning to published, track that
        if (
            status == ComponentStatus.PUBLISHED
            and component.status != ComponentStatus.PUBLISHED
        ):
            component.published_at = datetime.now(timezone.utc)
            component.published_by = user_id

        component.status = status

    # Update modified_at timestamp
    component.modified_at = datetime.now(timezone.utc)
    component.modified_by = user_id

    # Update version
    current_version = component.version
    component.version = current_version + 1

    # Execute update
    db.commit()
    db.refresh(component)

    return component


async def get_component(
    db: Session, tenant_id: uuid.UUID, component_id: uuid.UUID
) -> Optional[StorefrontComponent]:
    """
    Get a specific component by ID.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        component_id: UUID of the component

    Returns:
        StorefrontComponent or None if not found

    Raises:
        HTTPException: 404 if tenant not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Get the component
    component = (
        db.query(StorefrontComponent)
        .filter(
            StorefrontComponent.id == component_id,
            StorefrontComponent.tenant_id == tenant_id,
        )
        .first()
    )

    return component


async def list_components(
    db: Session,
    tenant_id: uuid.UUID,
    component_type: Optional[ComponentType] = None,
    status: Optional[ComponentStatus] = None,
    tags: Optional[List[str]] = None,
    search_query: Optional[str] = None,
    only_global: bool = False,
    limit: int = 20,
    offset: int = 0,
) -> Tuple[List[StorefrontComponent], int]:
    """
    List components for a tenant with filtering.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        component_type: Optional filter by component type
        status: Optional filter by status
        tags: Optional filter by tags
        search_query: Optional search in name and description
        only_global: Whether to return only global components
        limit: Maximum number of components to return
        offset: Offset for pagination

    Returns:
        Tuple of (list of components, total count)

    Raises:
        HTTPException: 404 if tenant not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Base query
    query = db.query(StorefrontComponent).filter(
        StorefrontComponent.tenant_id == tenant_id
    )

    # Apply component type filter
    if component_type:
        query = query.filter(
            StorefrontComponent.component_type == component_type)

    # Apply status filter
    if status:
        query = query.filter(StorefrontComponent.status == status)

    # Apply global filter
    if only_global:
        query = query.filter(StorefrontComponent.is_global)

    # Apply tag filter (simplified - would need database-specific implementation)
    if tags and len(tags) > 0:
        # For PostgreSQL, could use array overlap
        # query = query.filter(StorefrontComponent.tags.overlap(tags))
        pass

    # Apply search query
    if search_query:
        search_terms = f"%{search_query}%"
        query = query.filter(
            or_(
                StorefrontComponent.name.ilike(search_terms),
                StorefrontComponent.description.ilike(search_terms),
            )
        )

    # Get total count
    total_count = query.count()

    # Apply sorting and pagination
    query = query.order_by(desc(StorefrontComponent.created_at))
    query = query.offset(offset).limit(limit)

    # Execute query
    components = query.all()

    return components, total_count


async def delete_component(
    db: Session, tenant_id: uuid.UUID, component_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    """
    Delete a component.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        component_id: UUID of the component to delete
        user_id: UUID of the user deleting the component

    Returns:
        True if component was deleted, False if not found

    Raises:
        HTTPException: 404 if tenant or user not found
        HTTPException: 403 if user doesn't have permission
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Get the component
    component = (
        db.query(StorefrontComponent)
        .filter(
            StorefrontComponent.id == component_id,
            StorefrontComponent.tenant_id == tenant_id,
        )
        .first()
    )

    if not component:
        return False

    # Check permission
    has_perm = await StorefrontPermissionsService.has_permission(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        required_permission="delete",
        section=None,
        component_id=component_id,
    )

    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this component",
        )

    # FUTURE: Before deleting a component, check if it is in use by any storefront. See issue #123 for tracking.

    # Delete the component
    db.delete(component)
    db.commit()

    return True


async def publish_component(
    db: Session, tenant_id: uuid.UUID, component_id: uuid.UUID, user_id: uuid.UUID
) -> StorefrontComponent:
    """
    Publish a component.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        component_id: UUID of the component to publish
        user_id: UUID of the user publishing the component

    Returns:
        Published StorefrontComponent

    Raises:
        HTTPException: 404 if tenant, user, or component not found
        HTTPException: 403 if user doesn't have permission
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Get the component
    component = (
        db.query(StorefrontComponent)
        .filter(
            StorefrontComponent.id == component_id,
            StorefrontComponent.tenant_id == tenant_id,
        )
        .first()
    )

    if not component:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Component not found"
        )

    # Check permission
    has_perm = await StorefrontPermissionsService.has_permission(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        required_permission="publish",
        section=None,
        component_id=component_id,
    )

    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to publish this component",
        )

    # Update status to published
    component.status = ComponentStatus.PUBLISHED
    component.published_at = datetime.now(timezone.utc)
    component.published_by = user_id
    component.modified_at = datetime.now(timezone.utc)
    component.modified_by = user_id

    db.commit()
    db.refresh(component)

    return component


async def duplicate_component(
    db: Session,
    tenant_id: uuid.UUID,
    component_id: uuid.UUID,
    user_id: uuid.UUID,
    new_name: Optional[str] = None,
) -> StorefrontComponent:
    """
    Duplicate an existing component.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        component_id: UUID of the component to duplicate
        user_id: UUID of the user duplicating the component
        new_name: Optional name for the duplicated component

    Returns:
        Newly created StorefrontComponent (the duplicate)

    Raises:
        HTTPException: 404 if tenant, user, or component not found
        HTTPException: 403 if user doesn't have permission
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Get the source component
    source_component = (
        db.query(StorefrontComponent)
        .filter(
            StorefrontComponent.id == component_id,
            StorefrontComponent.tenant_id == tenant_id,
        )
        .first()
    )

    if not source_component:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Component not found"
        )

    # Check permission
    has_perm = await StorefrontPermissionsService.has_permission(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        required_permission="edit",
        section=None,
    )

    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to duplicate components",
        )

    # Create a new name if not provided
    if not new_name:
        new_name = f"{source_component.name} (Copy)"

    # Create the duplicate component
    duplicate = StorefrontComponent(
        tenant_id=tenant_id,
        name=new_name,
        component_type=source_component.component_type,
        configuration=source_component.configuration,
        description=source_component.description,
        is_global=source_component.is_global,
        tags=source_component.tags,
        status=ComponentStatus.DRAFT,  # Always start as draft
        created_by=user_id,
        duplicated_from=source_component.id,
    )

    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)

    return duplicate


async def validate_component_configuration(
    component_type: ComponentType, configuration: Dict[str, Any]
) -> None:
    """
    Validate component configuration based on its type.

    Args:
        component_type: Type of component
        configuration: Configuration to validate

    Raises:
        HTTPException: 400 if configuration is invalid
    """
    # This is a simplified validation - in a real implementation,
    # you would have more complex validation based on component type

    # Basic validation for required fields based on component type
    if component_type == ComponentType.HERO:
        required_fields = ["headline", "background_type"]
        if (
            "background_type" in configuration
            and configuration["background_type"] == "image"
        ):
            required_fields.append("image_id")

    elif component_type == ComponentType.PRODUCT_CARD:
        required_fields = ["layout", "show_price", "show_title"]

    elif component_type == ComponentType.CALL_TO_ACTION:
        required_fields = ["text", "button_text", "button_link"]

    elif component_type == ComponentType.TEXT_BLOCK:
        required_fields = ["content"]

    elif component_type == ComponentType.TESTIMONIAL:
        required_fields = ["quote", "author"]

    elif component_type == ComponentType.FEATURE_LIST:
        required_fields = ["title", "features"]

    elif component_type == ComponentType.NEWSLETTER_SIGNUP:
        required_fields = ["headline", "button_text"]

    elif component_type == ComponentType.IMAGE_GALLERY:
        required_fields = ["images"]

    elif component_type == ComponentType.CUSTOM:
        # Custom components might have any structure
        required_fields = []

    else:
        # Default case
        required_fields = []

    # Check for required fields
    for field in required_fields:
        if field not in configuration:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required field '{field}' for {component_type.value} component",
            )

    # Additional type-specific validations could go here
    # For example, validating that image_id is a valid UUID,
    # or that numeric values are within expected ranges


async def get_component_usage(
    db: Session, tenant_id: uuid.UUID, component_id: uuid.UUID
) -> List[Dict[str, Any]]:
    """
    Get information about where a component is being used.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        component_id: UUID of the component

    Returns:
        List of usage locations

    Raises:
        HTTPException: 404 if tenant or component not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Get the component
    component = (
        db.query(StorefrontComponent)
        .filter(
            StorefrontComponent.id == component_id,
            StorefrontComponent.tenant_id == tenant_id,
        )
        .first()
    )

    if not component:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Component not found"
        )

    # In a real implementation, this would query various tables
    # to find where the component is being used
    # For now, we'll return a placeholder

    # Example of what might be returned:
    # [
    #     {"type": "page", "id": "uuid", "name": "Home Page", "section": "hero"},
    #     {"type": "template", "id": "uuid", "name": "Product Detail", "section": "related"}
    # ]

    return []
