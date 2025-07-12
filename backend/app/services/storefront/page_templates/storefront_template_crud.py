"""
Storefront Template CRUD Operations

This module contains functions for creating, reading, updating, and deleting
storefront page templates.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import desc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from backend.app.models.storefront_page_template import (
    PageTemplateType,
    StorefrontPageTemplate,
    TemplateStatus,
)
from backend.app.models.tenant import Tenant
from backend.app.models.user import User
from backend.app.services.storefront.permissions.storefront_permissions_service import StorefrontPermissionsService
from .storefront_template_validator import validate_template_structure


async def create_page_template(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    name: str,
    template_type: PageTemplateType,
    structure: Dict[str, Any],
    description: Optional[str] = None,
    is_default: bool = False,
    tags: Optional[List[str]] = None,
    status: TemplateStatus = TemplateStatus.DRAFT,
) -> StorefrontPageTemplate:
    """
    Create a new page template.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user creating the template
        name: Template name
        template_type: Type of page template
        structure: Template structure defining sections and component slots
        description: Optional description of the template
        is_default: Whether this is the default template for its type
        tags: Optional tags for categorizing the template
        status: Template status (default: DRAFT)

    Returns:
        Newly created StorefrontPageTemplate

    Raises:
        HTTPException: 404 if tenant or user not found
        HTTPException: 403 if user doesn't have permission
        HTTPException: 400 if structure is invalid
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
        section="LAYOUT",
    )
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create page templates",
        )

    # Validate structure
    validate_template_structure(template_type, structure)

    # If this is set as default, unset other defaults of the same type
    if is_default:
        existing_defaults = (
            db.query(StorefrontPageTemplate)
            .filter(
                StorefrontPageTemplate.tenant_id == tenant_id,
                StorefrontPageTemplate.template_type == template_type,
                StorefrontPageTemplate.is_default == True,
                StorefrontPageTemplate.deleted_at.is_(None),
            )
            .all()
        )
        for template in existing_defaults:
            template.is_default = False
            db.add(template)

    # Create new template
    now = datetime.now(timezone.utc)
    new_template = StorefrontPageTemplate(
        tenant_id=tenant_id,
        name=name,
        template_type=template_type,
        structure=structure,
        description=description,
        is_default=is_default,
        tags=tags or [],
        status=status,
        created_at=now,
        updated_at=now,
        created_by=user_id,
        updated_by=user_id,
        version=1,
    )
    db.add(new_template)
    db.commit()
    db.refresh(new_template)

    return new_template


async def update_page_template(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    template_id: uuid.UUID,
    user_id: uuid.UUID,
    version: int,
    name: Optional[str] = None,
    structure: Optional[Dict[str, Any]] = None,
    description: Optional[str] = None,
    is_default: Optional[bool] = None,
    tags: Optional[List[str]] = None,
    status: Optional[TemplateStatus] = None,
) -> StorefrontPageTemplate:
    """
    Update an existing page template.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        template_id: UUID of the template to update
        user_id: UUID of the user updating the template
        version: Current version of the template
        name: Optional new template name
        structure: Optional new template structure
        description: Optional new description
        is_default: Optional new is_default flag
        tags: Optional new tags
        status: Optional new status

    Returns:
        Updated StorefrontPageTemplate

    Raises:
        HTTPException: 404 if tenant, user, or template not found
        HTTPException: 403 if user doesn't have permission
        HTTPException: 400 if structure is invalid
        HTTPException: 409 if page template was modified by another process
    """
    # Check if tenant exists
    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Check if user exists
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Check if template exists
    template = await db.get(StorefrontPageTemplate, template_id)
    if not template or template.tenant_id != tenant_id or template.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Page template not found"
        )

    # Check permission
    has_perm = await StorefrontPermissionsService.has_permission(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        required_permission="edit",
        section="LAYOUT",
    )
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update page templates",
        )

    # Optimistic concurrency control
    if template.version != version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The page template was modified by another process",
        )

    # If structure is provided, validate it
    if structure is not None:
        validate_template_structure(template.template_type, structure)
        template.structure = structure

    # Update fields if provided
    if name is not None:
        template.name = name
    if description is not None:
        template.description = description
    if tags is not None:
        template.tags = tags
    if status is not None:
        template.status = status

    # Handle is_default flag
    if is_default is not None and is_default != template.is_default:
        template.is_default = is_default
        if is_default:
            # Unset other defaults of the same type
            other_defaults = (
                await db.query(StorefrontPageTemplate)
                .filter(
                    StorefrontPageTemplate.tenant_id == tenant_id,
                    StorefrontPageTemplate.template_type == template.template_type,
                    StorefrontPageTemplate.is_default == True,
                    StorefrontPageTemplate.id != template_id,
                    StorefrontPageTemplate.deleted_at.is_(None),
                )
                .all()
            )
            for other in other_defaults:
                other.is_default = False
                await db.add(other)

    # Update metadata
    template.updated_at = datetime.now(timezone.utc)
    template.updated_by = user_id
    template.version += 1

    # Save changes
    await db.add(template)
    await db.commit()
    await db.refresh(template)

    return template


async def get_page_template(
    db: Session, tenant_id: uuid.UUID, template_id: uuid.UUID
) -> StorefrontPageTemplate:
    """
    Get a specific page template by ID.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        template_id: UUID of the template

    Returns:
        StorefrontPageTemplate or None if not found

    Raises:
        HTTPException: 404 if tenant not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Get template
    template = (
        db.query(StorefrontPageTemplate)
        .filter(
            StorefrontPageTemplate.tenant_id == tenant_id,
            StorefrontPageTemplate.id == template_id,
            StorefrontPageTemplate.deleted_at.is_(None),
        )
        .first()
    )

    return template


async def list_page_templates(
    db: Session,
    tenant_id: uuid.UUID,
    template_type: Optional[PageTemplateType] = None,
    status: Optional[TemplateStatus] = None,
    tags: Optional[List[str]] = None,
    search_query: Optional[str] = None,
    only_defaults: bool = False,
    limit: int = 20,
    offset: int = 0,
) -> Tuple[List[StorefrontPageTemplate], int]:
    """
    List page templates for a tenant with filtering.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        template_type: Optional filter by template type
        status: Optional filter by status
        tags: Optional filter by tags
        search_query: Optional search in name and description
        only_defaults: Whether to return only default templates
        limit: Maximum number of templates to return
        offset: Offset for pagination

    Returns:
        Tuple of (list of templates, total count)

    Raises:
        HTTPException: 404 if tenant not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Build query
    query = db.query(StorefrontPageTemplate).filter(
        StorefrontPageTemplate.tenant_id == tenant_id,
        StorefrontPageTemplate.deleted_at.is_(None),
    )

    # Apply filters
    if template_type:
        query = query.filter(StorefrontPageTemplate.template_type == template_type)
    if status:
        query = query.filter(StorefrontPageTemplate.status == status)
    if only_defaults:
        query = query.filter(StorefrontPageTemplate.is_default == True)
    if tags:
        for tag in tags:
            query = query.filter(StorefrontPageTemplate.tags.contains([tag]))
    if search_query:
        search_term = f"%{search_query}%"
        query = query.filter(
            or_(
                StorefrontPageTemplate.name.ilike(search_term),
                StorefrontPageTemplate.description.ilike(search_term),
            )
        )

    # Get total count
    total_count = query.count()

    # Apply pagination and sort by updated_at
    templates = (
        query.order_by(desc(StorefrontPageTemplate.updated_at))
        .limit(limit)
        .offset(offset)
        .all()
    )

    return templates, total_count


async def delete_page_template(
    db: Session, tenant_id: uuid.UUID, template_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    """
    Delete a page template.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        template_id: UUID of the template to delete
        user_id: UUID of the user deleting the template

    Returns:
        True if template was deleted, False if not found

    Raises:
        HTTPException: 404 if tenant or user not found
        HTTPException: 403 if user doesn't have permission
        HTTPException: 400 if template is in use or is the only default template
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
        required_permission="delete",
        section="LAYOUT",
    )
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete page templates",
        )

    # Get template
    template = (
        db.query(StorefrontPageTemplate)
        .filter(
            StorefrontPageTemplate.tenant_id == tenant_id,
            StorefrontPageTemplate.id == template_id,
            StorefrontPageTemplate.deleted_at.is_(None),
        )
        .first()
    )

    if not template:
        return False

    # Check if template is the only default template for its type
    if template.is_default:
        other_defaults = (
            db.query(StorefrontPageTemplate)
            .filter(
                StorefrontPageTemplate.tenant_id == tenant_id,
                StorefrontPageTemplate.template_type == template.template_type,
                StorefrontPageTemplate.is_default == True,
                StorefrontPageTemplate.id != template_id,
                StorefrontPageTemplate.deleted_at.is_(None),
            )
            .count()
        )

        if other_defaults == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the only default template for this type",
            )

    # TODO: Check if template is in use by any pages
    # This would require integration with a page service to check usage
    # For now, we'll assume it's not in use

    # Soft delete the template
    now = datetime.now(timezone.utc)
    template.deleted_at = now
    template.updated_at = now
    template.updated_by = user_id
    template.version += 1
    db.add(template)
    db.commit()

    return True
