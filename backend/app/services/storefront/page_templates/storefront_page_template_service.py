"""
Storefront Page Template Service

This module serves as an orchestrator for page template operations,
delegating to specialized modules while providing a unified interface.
"""

import uuid
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from backend.app.models.storefront_page_template import (
    PageTemplateType,
    StorefrontPageTemplate,
    TemplateStatus,
)

from .storefront_template_crud import (
    create_page_template as crud_create_page_template,
    update_page_template as crud_update_page_template,
    get_page_template as crud_get_page_template,
    list_page_templates as crud_list_page_templates,
    delete_page_template as crud_delete_page_template,
)
from .storefront_template_publisher import publish_page_template as impl_publish_page_template
from .storefront_template_utils import (
    duplicate_page_template as impl_duplicate_page_template,
    get_default_template as impl_get_default_template,
)
from .storefront_template_validator import validate_template_structure as impl_validate_template_structure


class StorefrontPageTemplateService:
    """
    Orchestrator service for page template operations.
    
    This class provides a unified interface for page template management
    by delegating to specialized modules.
    """

    @staticmethod
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
        
        Delegates to the CRUD module for implementation.
        """
        return await crud_create_page_template(
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

    @staticmethod
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
        
        Delegates to the CRUD module for implementation.
        """
        return await crud_update_page_template(
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

    @staticmethod
    async def get_page_template(
        db: Session, tenant_id: uuid.UUID, template_id: uuid.UUID
    ) -> StorefrontPageTemplate:
        """
        Get a specific page template by ID.
        
        Delegates to the CRUD module for implementation.
        """
        return await crud_get_page_template(
            db=db,
            tenant_id=tenant_id,
            template_id=template_id,
        )

    @staticmethod
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
        
        Delegates to the CRUD module for implementation.
        """
        return await crud_list_page_templates(
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

    @staticmethod
    async def delete_page_template(
        db: Session, tenant_id: uuid.UUID, template_id: uuid.UUID, user_id: uuid.UUID
    ) -> bool:
        """
        Delete a page template.
        
        Delegates to the CRUD module for implementation.
        """
        return await crud_delete_page_template(
            db=db,
            tenant_id=tenant_id,
            template_id=template_id,
            user_id=user_id,
        )

    @staticmethod
    async def publish_page_template(
        db: Session, tenant_id: uuid.UUID, template_id: uuid.UUID, user_id: uuid.UUID
    ) -> StorefrontPageTemplate:
        """
        Publish a page template.
        
        Delegates to the publisher module for implementation.
        """
        return await impl_publish_page_template(
            db=db,
            tenant_id=tenant_id,
            template_id=template_id,
            user_id=user_id,
        )

    @staticmethod
    async def duplicate_page_template(
        db: Session,
        tenant_id: uuid.UUID,
        template_id: uuid.UUID,
        user_id: uuid.UUID,
        new_name: Optional[str] = None,
    ) -> StorefrontPageTemplate:
        """
        Duplicate an existing page template.
        
        Delegates to the utils module for implementation.
        """
        return await impl_duplicate_page_template(
            db=db,
            tenant_id=tenant_id,
            template_id=template_id,
            user_id=user_id,
            new_name=new_name,
        )

    @staticmethod
    async def get_default_template(
        db: Session, tenant_id: uuid.UUID, template_type: PageTemplateType
    ) -> Optional[StorefrontPageTemplate]:
        """
        Get the default template for a specific page type.
        
        Delegates to the utils module for implementation.
        """
        return await impl_get_default_template(
            db=db,
            tenant_id=tenant_id,
            template_type=template_type,
        )

    @staticmethod
    def validate_template_structure(
        template_type: PageTemplateType, structure: Dict[str, Any]
    ) -> None:
        """
        Validate template structure based on its type.
        
        Delegates to the validator module for implementation.
        """
        impl_validate_template_structure(
            template_type=template_type,
            structure=structure,
        )
