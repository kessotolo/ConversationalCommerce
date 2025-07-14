"""
Storefront Permissions Service Orchestrator

This module serves as the main orchestrator for storefront permissions,
delegating to specialized services while maintaining a clean API.
"""

import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.app.models.storefront_permission import (
    StorefrontPermission,
    StorefrontRole,
    StorefrontSectionType,
)

# Import all sub-services
from .storefront_role_service import (
    assign_role,
    get_user_permissions,
    has_permission,
    list_users_with_permissions,
    remove_user_permission,
)

from .storefront_section_permissions_service import (
    set_section_permission,
    get_section_permissions,
)

from .storefront_component_permissions_service import (
    set_component_permission,
    get_component_permissions,
)

from .storefront_permissions_validator import (
    validate_json_schema,
    validate_theme_settings,
    validate_layout_config,
)

from .storefront_html_sanitizer import (
    sanitize_html_content,
    is_valid_html,
)

from .storefront_permissions_utils import (
    log_permission_change,
)


class StorefrontPermissionsService:
    """Orchestrator service that delegates to specialized permissions services.

    This class provides a unified API for all permission-related operations,
    following the orchestrator pattern established in the Order Service refactor.
    """

    async def assign_role(
        self,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        role: StorefrontRole,
        assigned_by: uuid.UUID,
    ) -> StorefrontPermission:
        """
        Assign a storefront role to a user.

        Delegates to the specialized role service.
        """
        return await assign_role(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            role=role,
            assigned_by=assigned_by,
        )

    async def set_section_permission(
        self,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        section: StorefrontSectionType,
        permissions: List[str],
        assigned_by: uuid.UUID,
    ) -> StorefrontPermission:
        """
        Set section-specific permissions for a user.

        Delegates to the specialized section permissions service.
        """
        return await set_section_permission(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            section=section,
            permissions=permissions,
            assigned_by=assigned_by,
        )

    async def set_component_permission(
        self,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        component_id: uuid.UUID,
        permissions: List[str],
        assigned_by: uuid.UUID,
    ) -> StorefrontPermission:
        """
        Set component-specific permissions for a user.

        Delegates to the specialized component permissions service.
        """
        return await set_component_permission(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            component_id=component_id,
            permissions=permissions,
            assigned_by=assigned_by,
        )

    async def get_user_permissions(
        self, db: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Get all permissions for a user.

        Delegates to the specialized role service.
        """
        return await get_user_permissions(db=db, tenant_id=tenant_id, user_id=user_id)

    async def has_permission(
        self,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        required_permission: str,
        section: Optional[str] = None,
        component_id: Optional[uuid.UUID] = None,
    ) -> bool:
        """
        Check if a user has a specific permission.

        Delegates to the specialized role service's permission checker.
        """
        return await has_permission(
            db=db,
            tenant_id=tenant_id,
            user_id=user_id,
            required_permission=required_permission,
            section=section,
            component_id=component_id,
        )

    async def list_users_with_permissions(
        self, db: AsyncSession, tenant_id: uuid.UUID
    ) -> List[Dict[str, Any]]:
        """
        List all users with their permissions for a tenant.

        Delegates to the specialized role service.
        """
        return await list_users_with_permissions(db=db, tenant_id=tenant_id)

    async def remove_user_permission(
        self, db: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID, removed_by: uuid.UUID
    ) -> bool:
        """
        Remove all permissions for a user.

        Delegates to the specialized role service.
        """
        return await remove_user_permission(
            db=db, tenant_id=tenant_id, user_id=user_id, removed_by=removed_by
        )

    def validate_theme_settings(self, theme_settings: Dict[str, Any]) -> tuple[bool, str]:
        """
        Validate theme settings against the theme schema.

        Delegates to the specialized validator service.
        """
        return validate_theme_settings(theme_settings=theme_settings)

    def validate_layout_config(self, layout_config: Dict[str, Any]) -> tuple[bool, str]:
        """
        Validate layout configuration against the layout schema.

        Delegates to the specialized validator service.
        """
        return validate_layout_config(layout_config=layout_config)

    def sanitize_html_content(self, content: str) -> str:
        """
        Sanitize HTML content to prevent XSS attacks.

        Delegates to the specialized HTML sanitizer service.
        """
        return sanitize_html_content(content=content)

    def is_valid_html(self, content: str) -> bool:
        """
        Check if HTML content is valid and safe.

        Delegates to the specialized HTML sanitizer service.
        """
        return is_valid_html(content=content)
