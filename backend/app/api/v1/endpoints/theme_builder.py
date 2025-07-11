from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.schemas.theme_builder import (
    ThemeBuilderCreateRequest,
    ThemeBuilderUpdateRequest,
    ThemeBuilderResponse,
    ThemeVersionCreate,
    ThemeVersionUpdate,
    ThemeVersionResponse,
    WhatsAppThemeCommand,
    WhatsAppThemeResponse,
)
from app.services.theme_builder_service import (
    ThemeBuilderService,
    ThemeBuilderError,
    ThemeNotFoundError,
    ThemeVersionNotFoundError,
)
from app.models.user import User

router = APIRouter()


def handle_theme_builder_error(error: ThemeBuilderError) -> HTTPException:
    """Map theme builder errors to HTTP exceptions."""
    if isinstance(error, ThemeNotFoundError):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )
    elif isinstance(error, ThemeVersionNotFoundError):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )
    else:
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Theme builder error: {str(error)}"
        )


@router.post("/", response_model=ThemeBuilderResponse)
async def create_theme(
    request: ThemeBuilderCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ThemeBuilderResponse:
    """Create a new theme."""
    try:
        service = ThemeBuilderService(db)
        return await service.create_theme(
            request=request,
            tenant_id=current_user.tenant_id,
            user_id=current_user.id
        )
    except ThemeBuilderError as e:
        raise handle_theme_builder_error(e)


@router.get("/{theme_id}", response_model=ThemeBuilderResponse)
async def get_theme(
    theme_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ThemeBuilderResponse:
    """Get a theme by ID."""
    try:
        service = ThemeBuilderService(db)
        return await service.get_theme(
            theme_id=theme_id,
            tenant_id=current_user.tenant_id
        )
    except ThemeBuilderError as e:
        raise handle_theme_builder_error(e)


@router.put("/{theme_id}", response_model=ThemeBuilderResponse)
async def update_theme(
    theme_id: UUID,
    request: ThemeBuilderUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ThemeBuilderResponse:
    """Update a theme."""
    try:
        service = ThemeBuilderService(db)
        return await service.update_theme(
            theme_id=theme_id,
            request=request,
            tenant_id=current_user.tenant_id
        )
    except ThemeBuilderError as e:
        raise handle_theme_builder_error(e)


@router.delete("/{theme_id}")
async def delete_theme(
    theme_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Delete a theme."""
    try:
        service = ThemeBuilderService(db)
        await service.delete_theme(
            theme_id=theme_id,
            tenant_id=current_user.tenant_id
        )
        return {"message": "Theme deleted successfully"}
    except ThemeBuilderError as e:
        raise handle_theme_builder_error(e)


@router.post("/{theme_id}/versions", response_model=ThemeVersionResponse)
async def create_version(
    theme_id: UUID,
    request: ThemeVersionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ThemeVersionResponse:
    """Create a new theme version."""
    try:
        service = ThemeBuilderService(db)
        # Ensure the version is for the correct theme
        request.theme_id = theme_id
        request.created_by = current_user.id
        return await service.create_version(
            request=request,
            tenant_id=current_user.tenant_id
        )
    except ThemeBuilderError as e:
        raise handle_theme_builder_error(e)


@router.get("/versions/{version_id}", response_model=ThemeVersionResponse)
async def get_version(
    version_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ThemeVersionResponse:
    """Get a theme version by ID."""
    try:
        service = ThemeBuilderService(db)
        return await service.get_version(
            version_id=version_id,
            tenant_id=current_user.tenant_id
        )
    except ThemeBuilderError as e:
        raise handle_theme_builder_error(e)


@router.put("/versions/{version_id}", response_model=ThemeVersionResponse)
async def update_version(
    version_id: UUID,
    request: ThemeVersionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ThemeVersionResponse:
    """Update a theme version."""
    try:
        service = ThemeBuilderService(db)
        return await service.update_version(
            version_id=version_id,
            request=request,
            tenant_id=current_user.tenant_id
        )
    except ThemeBuilderError as e:
        raise handle_theme_builder_error(e)


@router.post("/versions/{version_id}/publish", response_model=ThemeVersionResponse)
async def publish_version(
    version_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ThemeVersionResponse:
    """Publish a theme version."""
    try:
        service = ThemeBuilderService(db)
        return await service.publish_version(
            version_id=version_id,
            tenant_id=current_user.tenant_id
        )
    except ThemeBuilderError as e:
        raise handle_theme_builder_error(e)


@router.post("/whatsapp/command", response_model=WhatsAppThemeResponse)
async def handle_whatsapp_command(
    command: WhatsAppThemeCommand,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WhatsAppThemeResponse:
    """Handle WhatsApp theme commands."""
    try:
        service = ThemeBuilderService(db)
        return await service.handle_whatsapp_command(
            command=command,
            tenant_id=current_user.tenant_id,
            user_id=current_user.id
        )
    except ThemeBuilderError as e:
        return WhatsAppThemeResponse(
            success=False,
            message=f"Error: {str(e)}"
        )
