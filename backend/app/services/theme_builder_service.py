import uuid
from datetime import datetime
from typing import List, Optional, Union
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.exceptions import ResourceNotFoundError, ValidationError
from backend.app.models.storefront_theme import StorefrontTheme
from backend.app.models.theme_version import ThemeVersion
from backend.app.schemas.theme_builder import (
    ThemeBuilderCreateRequest,
    ThemeBuilderUpdateRequest,
    ThemeBuilderResponse,
    ThemeVersionCreate,
    ThemeVersionUpdate,
    ThemeVersionResponse,
    ThemeLayoutSchema,
    WhatsAppThemeCommand,
    WhatsAppThemeResponse,
)


class ThemeBuilderError(Exception):
    """Base exception for theme builder operations."""
    pass


class ThemeNotFoundError(ThemeBuilderError):
    """Raised when a theme is not found."""
    pass


class ThemeVersionNotFoundError(ThemeBuilderError):
    """Raised when a theme version is not found."""
    pass


class ThemeValidationError(ThemeBuilderError):
    """Raised when theme data is invalid."""
    pass


class ThemeBuilderService:
    """Service for theme builder operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_theme(
        self,
        request: ThemeBuilderCreateRequest,
        tenant_id: UUID,
        user_id: UUID
    ) -> ThemeBuilderResponse:
        """Create a new theme."""
        try:
            # Create the theme
            theme = StorefrontTheme(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                name=request.name,
                description=request.description,
                layout=request.layout.dict() if request.layout else self._get_default_layout(),
                created_by=user_id,
            )

            self.db.add(theme)
            await self.db.flush()

            # Create initial version
            initial_version = ThemeVersion(
                id=uuid.uuid4(),
                theme_id=theme.id,
                tenant_id=tenant_id,
                version_number="1.0.0",
                name="Initial Version",
                description="Initial theme version",
                layout=theme.layout,
                created_by=user_id,
                is_published=True,
            )

            self.db.add(initial_version)
            await self.db.commit()

            return await self._build_theme_response(theme)

        except Exception as e:
            await self.db.rollback()
            raise ThemeBuilderError(f"Failed to create theme: {str(e)}")

    async def get_theme(self, theme_id: UUID, tenant_id: UUID) -> ThemeBuilderResponse:
        """Get a theme by ID."""
        query = (
            select(StorefrontTheme)
            .where(StorefrontTheme.id == theme_id)
            .where(StorefrontTheme.tenant_id == tenant_id)
            .options(selectinload(StorefrontTheme.versions))
        )

        result = await self.db.execute(query)
        theme = result.scalar_one_or_none()

        if not theme:
            raise ThemeNotFoundError(f"Theme {theme_id} not found")

        return await self._build_theme_response(theme)

    async def update_theme(
        self,
        theme_id: UUID,
        request: ThemeBuilderUpdateRequest,
        tenant_id: UUID
    ) -> ThemeBuilderResponse:
        """Update a theme."""
        query = (
            select(StorefrontTheme)
            .where(StorefrontTheme.id == theme_id)
            .where(StorefrontTheme.tenant_id == tenant_id)
        )

        result = await self.db.execute(query)
        theme = result.scalar_one_or_none()

        if not theme:
            raise ThemeNotFoundError(f"Theme {theme_id} not found")

        # Update fields
        if request.name is not None:
            theme.name = request.name
        if request.description is not None:
            theme.description = request.description
        if request.layout is not None:
            theme.layout = request.layout.dict()

        theme.updated_at = datetime.utcnow()
        await self.db.commit()

        return await self._build_theme_response(theme)

    async def delete_theme(self, theme_id: UUID, tenant_id: UUID) -> None:
        """Delete a theme."""
        query = (
            select(StorefrontTheme)
            .where(StorefrontTheme.id == theme_id)
            .where(StorefrontTheme.tenant_id == tenant_id)
        )

        result = await self.db.execute(query)
        theme = result.scalar_one_or_none()

        if not theme:
            raise ThemeNotFoundError(f"Theme {theme_id} not found")

        await self.db.delete(theme)
        await self.db.commit()

    async def create_version(
        self,
        request: ThemeVersionCreate,
        tenant_id: UUID
    ) -> ThemeVersionResponse:
        """Create a new theme version."""
        # Verify theme exists
        theme_query = (
            select(StorefrontTheme)
            .where(StorefrontTheme.id == request.theme_id)
            .where(StorefrontTheme.tenant_id == tenant_id)
        )

        result = await self.db.execute(theme_query)
        theme = result.scalar_one_or_none()

        if not theme:
            raise ThemeNotFoundError(f"Theme {request.theme_id} not found")

        # Create version
        version = ThemeVersion(
            id=uuid.uuid4(),
            theme_id=request.theme_id,
            tenant_id=tenant_id,
            version_number=request.version_number,
            name=request.name,
            description=request.description,
            layout=request.layout.dict(),
            created_by=request.created_by,
            is_published=request.is_published,
        )

        self.db.add(version)
        await self.db.commit()

        return ThemeVersionResponse.from_orm(version)

    async def get_version(
        self,
        version_id: UUID,
        tenant_id: UUID
    ) -> ThemeVersionResponse:
        """Get a theme version by ID."""
        query = (
            select(ThemeVersion)
            .where(ThemeVersion.id == version_id)
            .where(ThemeVersion.tenant_id == tenant_id)
        )

        result = await self.db.execute(query)
        version = result.scalar_one_or_none()

        if not version:
            raise ThemeVersionNotFoundError(f"Version {version_id} not found")

        return ThemeVersionResponse.from_orm(version)

    async def update_version(
        self,
        version_id: UUID,
        request: ThemeVersionUpdate,
        tenant_id: UUID
    ) -> ThemeVersionResponse:
        """Update a theme version."""
        query = (
            select(ThemeVersion)
            .where(ThemeVersion.id == version_id)
            .where(ThemeVersion.tenant_id == tenant_id)
        )

        result = await self.db.execute(query)
        version = result.scalar_one_or_none()

        if not version:
            raise ThemeVersionNotFoundError(f"Version {version_id} not found")

        # Update fields
        if request.name is not None:
            version.name = request.name
        if request.description is not None:
            version.description = request.description
        if request.layout is not None:
            version.layout = request.layout.dict()
        if request.is_published is not None:
            version.is_published = request.is_published

        version.updated_at = datetime.utcnow()
        await self.db.commit()

        return ThemeVersionResponse.from_orm(version)

    async def publish_version(self, version_id: UUID, tenant_id: UUID) -> ThemeVersionResponse:
        """Publish a theme version."""
        query = (
            select(ThemeVersion)
            .where(ThemeVersion.id == version_id)
            .where(ThemeVersion.tenant_id == tenant_id)
        )

        result = await self.db.execute(query)
        version = result.scalar_one_or_none()

        if not version:
            raise ThemeVersionNotFoundError(f"Version {version_id} not found")

        # Unpublish all other versions for this theme
        await self.db.execute(
            "UPDATE theme_versions SET is_published = false WHERE theme_id = :theme_id",
            {"theme_id": version.theme_id}
        )

        # Publish this version
        version.is_published = True
        version.updated_at = datetime.utcnow()
        await self.db.commit()

        return ThemeVersionResponse.from_orm(version)

    async def handle_whatsapp_command(
        self,
        command: WhatsAppThemeCommand,
        tenant_id: UUID,
        user_id: UUID
    ) -> WhatsAppThemeResponse:
        """Handle WhatsApp theme commands."""
        try:
            if command.command == "preview":
                return await self._handle_preview_command(command, tenant_id)
            elif command.command == "publish":
                return await self._handle_publish_command(command, tenant_id, user_id)
            elif command.command == "reset":
                return await self._handle_reset_command(command, tenant_id, user_id)
            elif command.command == "list":
                return await self._handle_list_command(tenant_id)
            else:
                return WhatsAppThemeResponse(
                    success=False,
                    message=f"Unknown command: {command.command}"
                )
        except Exception as e:
            return WhatsAppThemeResponse(
                success=False,
                message=f"Error processing command: {str(e)}"
            )

    async def _handle_preview_command(
        self,
        command: WhatsAppThemeCommand,
        tenant_id: UUID
    ) -> WhatsAppThemeResponse:
        """Handle preview command."""
        if not command.theme_name:
            return WhatsAppThemeResponse(
                success=False,
                message="Please specify a theme name to preview"
            )

        # Find theme by name
        query = (
            select(StorefrontTheme)
            .where(StorefrontTheme.name.ilike(f"%{command.theme_name}%"))
            .where(StorefrontTheme.tenant_id == tenant_id)
        )

        result = await self.db.execute(query)
        theme = result.scalar_one_or_none()

        if not theme:
            return WhatsAppThemeResponse(
                success=False,
                message=f"Theme '{command.theme_name}' not found"
            )

        return WhatsAppThemeResponse(
            success=True,
            message=f"Previewing theme: {theme.name}",
            data={"theme_id": str(theme.id),
                  "preview_url": f"/preview/{theme.id}"}
        )

    async def _handle_publish_command(
        self,
        command: WhatsAppThemeCommand,
        tenant_id: UUID,
        user_id: UUID
    ) -> WhatsAppThemeResponse:
        """Handle publish command."""
        if not command.theme_name:
            return WhatsAppThemeResponse(
                success=False,
                message="Please specify a theme name to publish"
            )

        # Find theme by name
        query = (
            select(StorefrontTheme)
            .where(StorefrontTheme.name.ilike(f"%{command.theme_name}%"))
            .where(StorefrontTheme.tenant_id == tenant_id)
        )

        result = await self.db.execute(query)
        theme = result.scalar_one_or_none()

        if not theme:
            return WhatsAppThemeResponse(
                success=False,
                message=f"Theme '{command.theme_name}' not found"
            )

        # Get the latest version
        version_query = (
            select(ThemeVersion)
            .where(ThemeVersion.theme_id == theme.id)
            .order_by(ThemeVersion.created_at.desc())
        )

        result = await self.db.execute(version_query)
        latest_version = result.scalar_one_or_none()

        if not latest_version:
            return WhatsAppThemeResponse(
                success=False,
                message="No versions found for this theme"
            )

        # Publish the version
        await self.publish_version(latest_version.id, tenant_id)

        return WhatsAppThemeResponse(
            success=True,
            message=f"Published theme: {theme.name} (v{latest_version.version_number})"
        )

    async def _handle_reset_command(
        self,
        command: WhatsAppThemeCommand,
        tenant_id: UUID,
        user_id: UUID
    ) -> WhatsAppThemeResponse:
        """Handle reset command."""
        if not command.theme_name:
            return WhatsAppThemeResponse(
                success=False,
                message="Please specify a theme name to reset"
            )

        # Find theme by name
        query = (
            select(StorefrontTheme)
            .where(StorefrontTheme.name.ilike(f"%{command.theme_name}%"))
            .where(StorefrontTheme.tenant_id == tenant_id)
        )

        result = await self.db.execute(query)
        theme = result.scalar_one_or_none()

        if not theme:
            return WhatsAppThemeResponse(
                success=False,
                message=f"Theme '{command.theme_name}' not found"
            )

        # Reset to default layout
        theme.layout = self._get_default_layout()
        theme.updated_at = datetime.utcnow()
        await self.db.commit()

        return WhatsAppThemeResponse(
            success=True,
            message=f"Reset theme: {theme.name} to default layout"
        )

    async def _handle_list_command(self, tenant_id: UUID) -> WhatsAppThemeResponse:
        """Handle list command."""
        query = (
            select(StorefrontTheme)
            .where(StorefrontTheme.tenant_id == tenant_id)
            .order_by(StorefrontTheme.created_at.desc())
        )

        result = await self.db.execute(query)
        themes = result.scalars().all()

        if not themes:
            return WhatsAppThemeResponse(
                success=True,
                message="No themes found"
            )

        theme_list = [f"• {theme.name}" for theme in themes]

        return WhatsAppThemeResponse(
            success=True,
            message=f"Your themes:\n" + "\n".join(theme_list)
        )

    async def _build_theme_response(self, theme: StorefrontTheme) -> ThemeBuilderResponse:
        """Build a theme response with versions."""
        # Get versions
        version_query = (
            select(ThemeVersion)
            .where(ThemeVersion.theme_id == theme.id)
            .order_by(ThemeVersion.created_at.desc())
        )

        result = await self.db.execute(version_query)
        versions = result.scalars().all()

        # Find current published version
        current_version = None
        for version in versions:
            if version.is_published:
                current_version = ThemeVersionResponse.from_orm(version)
                break

        return ThemeBuilderResponse(
            id=theme.id,
            name=theme.name,
            description=theme.description,
            layout=ThemeLayoutSchema.parse_obj(theme.layout),
            current_version=current_version,
            versions=[ThemeVersionResponse.from_orm(v) for v in versions],
            created_at=theme.created_at,
            updated_at=theme.updated_at,
        )

    def _get_default_layout(self) -> dict:
        """Get default theme layout."""
        return {
            "sections": [
                {
                    "id": "header",
                    "type": "header",
                    "title": "Header",
                    "visible": True,
                    "order": 1,
                    "config": {}
                },
                {
                    "id": "hero",
                    "type": "hero",
                    "title": "Hero Section",
                    "visible": True,
                    "order": 2,
                    "config": {}
                },
                {
                    "id": "products",
                    "type": "products",
                    "title": "Products",
                    "visible": True,
                    "order": 3,
                    "config": {}
                },
                {
                    "id": "footer",
                    "type": "footer",
                    "title": "Footer",
                    "visible": True,
                    "order": 4,
                    "config": {}
                }
            ],
            "colors": {
                "primary": "#3B82F6",
                "secondary": "#64748B",
                "accent": "#F59E0B",
                "background": "#FFFFFF",
                "surface": "#F8FAFC",
                "text_primary": "#1E293B",
                "text_secondary": "#64748B",
                "border": "#E2E8F0",
                "success": "#10B981",
                "warning": "#F59E0B",
                "error": "#EF4444"
            },
            "typography": {
                "font_family_primary": "Inter",
                "font_family_secondary": "Inter",
                "font_size_base": "16px",
                "font_size_h1": "32px",
                "font_size_h2": "24px",
                "font_size_h3": "20px",
                "font_size_h4": "18px",
                "font_size_h5": "16px",
                "font_size_h6": "14px",
                "font_weight_normal": 400,
                "font_weight_medium": 500,
                "font_weight_bold": 700,
                "line_height_base": 1.5,
                "letter_spacing_base": "0px"
            },
            "spacing": {
                "spacing_xs": "4px",
                "spacing_sm": "8px",
                "spacing_md": "16px",
                "spacing_lg": "24px",
                "spacing_xl": "32px",
                "spacing_2xl": "48px",
                "spacing_3xl": "64px"
            },
            "breakpoints": {
                "mobile": "768px",
                "tablet": "1024px",
                "desktop": "1280px",
                "wide": "1536px"
            }
        }
