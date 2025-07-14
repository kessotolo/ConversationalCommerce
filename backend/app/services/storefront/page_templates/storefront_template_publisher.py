"""
Storefront Template Publisher

This module contains functions for publishing page templates.
"""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.app.models.storefront_page_template import (
    StorefrontPageTemplate,
    TemplateStatus,
)
from app.app.models.tenant import Tenant
from app.app.models.user import User
from app.app.services.storefront.permissions.storefront_permissions_service import StorefrontPermissionsService


async def publish_page_template(
    db: Session, tenant_id: uuid.UUID, template_id: uuid.UUID, user_id: uuid.UUID
) -> StorefrontPageTemplate:
    """
    Publish a page template.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        template_id: UUID of the template to publish
        user_id: UUID of the user publishing the template

    Returns:
        Published StorefrontPageTemplate

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
        required_permission="publish",
        section="LAYOUT",
    )
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to publish page templates",
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Page template not found"
        )

    # If already published, return as is
    if template.status == TemplateStatus.PUBLISHED:
        return template

    # Update template status and metadata
    template.status = TemplateStatus.PUBLISHED
    template.updated_at = datetime.now(timezone.utc)
    template.updated_by = user_id
    template.version += 1
    db.add(template)
    db.commit()
    db.refresh(template)

    return template
