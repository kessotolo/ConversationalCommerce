"""Storefront Page Template Service

This file provides backward compatibility with existing code by forwarding
calls to the new modular implementation. New code should import directly from
the app.services.storefront.page_templates package.
"""

import uuid
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.models.storefront_page_template import (
    PageTemplateType,
    StorefrontPageTemplate,
    TemplateStatus,
)
from app.services.storefront.page_templates.storefront_page_template_service import StorefrontPageTemplateService


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
    """Delegate to the new service implementation."""
    return await StorefrontPageTemplateService.create_page_template(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        name=name,
        template_type=template_type,
        structure=structure,
        description=description,
        is_default=is_default,
        tags=tags,
        status=status,
    )


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
    """Delegate to the new service implementation."""
    return await StorefrontPageTemplateService.update_page_template(
        db=db,
        tenant_id=tenant_id,
        template_id=template_id,
        user_id=user_id,
        version=version,
        name=name,
        structure=structure,
        description=description,
        is_default=is_default,
        tags=tags,
        status=status,
    )


async def get_page_template(
    db: Session, tenant_id: uuid.UUID, template_id: uuid.UUID
) -> Optional[StorefrontPageTemplate]:
    """Delegate to the new service implementation."""
    return await StorefrontPageTemplateService.get_page_template(
        db=db,
        tenant_id=tenant_id,
        template_id=template_id,
    )


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
    """Delegate to the new service implementation."""
    return await StorefrontPageTemplateService.list_page_templates(
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


async def delete_page_template(
    db: Session, tenant_id: uuid.UUID, template_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    """Delegate to the new service implementation."""
    return await StorefrontPageTemplateService.delete_page_template(
        db=db,
        tenant_id=tenant_id,
        template_id=template_id,
        user_id=user_id,
    )


async def publish_page_template(
    db: Session, tenant_id: uuid.UUID, template_id: uuid.UUID, user_id: uuid.UUID
) -> StorefrontPageTemplate:
    """Delegate to the new service implementation."""
    return await StorefrontPageTemplateService.publish_page_template(
        db=db,
        tenant_id=tenant_id,
        template_id=template_id,
        user_id=user_id,
    )


async def duplicate_page_template(
    db: Session,
    tenant_id: uuid.UUID,
    template_id: uuid.UUID,
    user_id: uuid.UUID,
    new_name: Optional[str] = None,
) -> StorefrontPageTemplate:
    """Delegate to the new service implementation."""
    return await StorefrontPageTemplateService.duplicate_page_template(
        db=db,
        tenant_id=tenant_id,
        template_id=template_id,
        user_id=user_id,
        new_name=new_name,
    )


async def get_default_template(
    db: Session, tenant_id: uuid.UUID, template_type: PageTemplateType
) -> Optional[StorefrontPageTemplate]:
    """Delegate to the new service implementation."""
    return await StorefrontPageTemplateService.get_default_template(
        db=db,
        tenant_id=tenant_id,
        template_type=template_type,
    )


def validate_template_structure(
    template_type: PageTemplateType, structure: Dict[str, Any]
) -> None:
    """Delegate to the new service implementation."""
    return StorefrontPageTemplateService.validate_template_structure(
        template_type=template_type,
        structure=structure,
    )
