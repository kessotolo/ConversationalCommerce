"""
Storefront Template Utilities

This module contains utility functions for page templates.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.storefront_page_template import (
    PageTemplateType,
    StorefrontPageTemplate,
    TemplateStatus,
)
from app.models.tenant import Tenant
from app.models.user import User
from app.services.storefront.permissions.storefront_permissions_service import StorefrontPermissionsService


async def duplicate_page_template(
    db: Session,
    tenant_id: uuid.UUID,
    template_id: uuid.UUID,
    user_id: uuid.UUID,
    new_name: Optional[str] = None,
) -> StorefrontPageTemplate:
    """
    Duplicate an existing page template.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        template_id: UUID of the template to duplicate
        user_id: UUID of the user duplicating the template
        new_name: Optional name for the duplicated template

    Returns:
        Newly created StorefrontPageTemplate (the duplicate)

    Raises:
        HTTPException: 404 if tenant, user, or template not found
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
        section="LAYOUT",
    )
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to duplicate page templates",
        )

    # Get template to duplicate
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Page template not found"
        )

    # Generate duplicate name if not provided
    if not new_name:
        new_name = f"{template.name} (Copy)"

    # Create new template with same properties but new ID
    now = datetime.now(timezone.utc)
    duplicate = StorefrontPageTemplate(
        tenant_id=tenant_id,
        name=new_name,
        template_type=template.template_type,
        structure=template.structure,
        description=template.description,
        is_default=False,  # never make duplicate the default
        tags=template.tags,
        status=TemplateStatus.DRAFT,  # always start as draft
        created_at=now,
        updated_at=now,
        created_by=user_id,
        updated_by=user_id,
        version=1,
    )
    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)

    return duplicate


async def get_default_template(
    db: Session, tenant_id: uuid.UUID, template_type: PageTemplateType
) -> Optional[StorefrontPageTemplate]:
    """
    Get the default template for a specific page type.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        template_type: Type of page template

    Returns:
        Default StorefrontPageTemplate or None if not found

    Raises:
        HTTPException: 404 if tenant not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Get default template
    default_template = (
        db.query(StorefrontPageTemplate)
        .filter(
            StorefrontPageTemplate.tenant_id == tenant_id,
            StorefrontPageTemplate.template_type == template_type,
            StorefrontPageTemplate.is_default == True,
            StorefrontPageTemplate.deleted_at.is_(None),
        )
        .first()
    )

    return default_template
