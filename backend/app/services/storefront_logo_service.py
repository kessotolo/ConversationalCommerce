import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app.app.models.storefront_logo import LogoStatus, LogoType, StorefrontLogo
from app.app.models.tenant import Tenant
from app.app.models.user import User
from app.app.services.storefront_asset_service import get_asset, track_asset_usage
from app.app.services.storefront.permissions.storefront_permissions_service import StorefrontPermissionsService


async def create_logo(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    name: str,
    logo_type: LogoType,
    asset_id: uuid.UUID,
    display_settings: Optional[Dict[str, Any]] = None,
    responsive_settings: Optional[Dict[str, Any]] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status: LogoStatus = LogoStatus.DRAFT,
) -> StorefrontLogo:
    """
    Create a new logo for a tenant's storefront.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user creating the logo
        name: Logo name for admin reference
        logo_type: Type of logo
        asset_id: UUID of the asset to use for the logo
        display_settings: Optional display settings (position, size, etc.)
        responsive_settings: Optional responsive display settings for different breakpoints
        start_date: Optional date when logo should start displaying
        end_date: Optional date when logo should stop displaying
        status: Logo status (default: DRAFT)

    Returns:
        Newly created StorefrontLogo

    Raises:
        HTTPException: 404 if tenant, user, or asset not found
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
            detail="You don't have permission to create logos",
        )

    # Check if asset exists
    asset = await get_asset(db, tenant_id, asset_id)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found"
        )

    # Check if there's already an active logo of the same type
    if logo_type == LogoType.PRIMARY:
        existing_logos = (
            db.query(StorefrontLogo)
            .filter(
                StorefrontLogo.tenant_id == tenant_id,
                StorefrontLogo.logo_type == LogoType.PRIMARY,
                StorefrontLogo.status == LogoStatus.PUBLISHED,
            )
            .all()
        )

        # If creating a new primary logo, set others to inactive
        if status == LogoStatus.PUBLISHED and existing_logos:
            for logo in existing_logos:
                logo.status = LogoStatus.INACTIVE

    # Create default display settings if not provided
    if display_settings is None:
        display_settings = {
            "maxWidth": "200px",
            "maxHeight": "80px",
            "position": "center",
        }

    # Create default responsive settings if not provided
    if responsive_settings is None:
        responsive_settings = {
            "mobile": {"maxWidth": "150px", "maxHeight": "60px"},
            "tablet": {"maxWidth": "180px", "maxHeight": "70px"},
            "desktop": {"maxWidth": "200px", "maxHeight": "80px"},
        }

    # Create the logo
    logo = StorefrontLogo(
        tenant_id=tenant_id,
        name=name,
        logo_type=logo_type,
        asset_id=asset_id,
        display_settings=display_settings,
        responsive_settings=responsive_settings,
        start_date=start_date,
        end_date=end_date,
        status=status,
        created_by=user_id,
    )

    db.add(logo)
    db.commit()
    db.refresh(logo)

    # Track asset usage
    await track_asset_usage(
        db=db,
        asset_id=asset_id,
        usage_location={"type": "logo", "id": str(logo.id), "name": name},
    )

    return logo


async def update_logo(
    db: Session,
    tenant_id: uuid.UUID,
    logo_id: uuid.UUID,
    user_id: uuid.UUID,
    version: int,
    name: Optional[str] = None,
    logo_type: Optional[LogoType] = None,
    asset_id: Optional[uuid.UUID] = None,
    display_settings: Optional[Dict[str, Any]] = None,
    responsive_settings: Optional[Dict[str, Any]] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status: Optional[LogoStatus] = None,
) -> StorefrontLogo:
    """
    Update an existing logo.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        logo_id: UUID of the logo to update
        user_id: UUID of the user updating the logo
        version: Current version of the logo
        name: Optional new logo name
        logo_type: Optional new logo type
        asset_id: Optional UUID of the new asset to use
        display_settings: Optional new display settings
        responsive_settings: Optional new responsive settings
        start_date: Optional new start date
        end_date: Optional new end date
        status: Optional new status

    Returns:
        Updated StorefrontLogo

    Raises:
        HTTPException: 404 if tenant, user, logo, or asset not found
        HTTPException: 403 if user doesn't have permission
        HTTPException: 409 if logo was modified by another process
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
            detail="You don't have permission to update logos",
        )

    # Get the logo
    logo = (
        db.query(StorefrontLogo)
        .filter(StorefrontLogo.id == logo_id, StorefrontLogo.tenant_id == tenant_id)
        .first()
    )

    if not logo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Logo not found"
        )

    # Check if changing asset and the new asset exists
    if asset_id and asset_id != logo.asset_id:
        asset = await get_asset(db, tenant_id, asset_id)
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="New asset not found"
            )

        # Track new asset usage
        await track_asset_usage(
            db=db,
            asset_id=asset_id,
            usage_location={"type": "logo", "id": str(logo.id), "name": logo.name},
        )

    # Handle logo type change to PRIMARY
    if logo_type == LogoType.PRIMARY and logo.logo_type != LogoType.PRIMARY:
        # If changing to PRIMARY, might need to update existing primary logos
        pass

    # Update status to PUBLISHED
    if status == LogoStatus.PUBLISHED and logo.status != LogoStatus.PUBLISHED:
        # If this is a primary logo, set other primary logos to inactive
        if (logo_type == LogoType.PRIMARY) or (
            logo_type is None and logo.logo_type == LogoType.PRIMARY
        ):
            other_primary_logos = (
                db.query(StorefrontLogo)
                .filter(
                    StorefrontLogo.tenant_id == tenant_id,
                    StorefrontLogo.logo_type == LogoType.PRIMARY,
                    StorefrontLogo.status == LogoStatus.PUBLISHED,
                    StorefrontLogo.id != logo_id,
                )
                .all()
            )

            for other_logo in other_primary_logos:
                other_logo.status = LogoStatus.INACTIVE

    # Update fields if provided
    if name is not None:
        logo.name = name

    if logo_type is not None:
        logo.logo_type = logo_type

    if asset_id is not None:
        logo.asset_id = asset_id

    if display_settings is not None:
        logo.display_settings = display_settings

    if responsive_settings is not None:
        logo.responsive_settings = responsive_settings

    if start_date is not None:
        logo.start_date = start_date

    if end_date is not None:
        logo.end_date = end_date

    if status is not None:
        # If transitioning to published, track that
        if status == LogoStatus.PUBLISHED and logo.status != LogoStatus.PUBLISHED:
            logo.published_at = datetime.now(timezone.utc)
            logo.published_by = user_id

        logo.status = status

    # Update modified_at timestamp
    logo.modified_at = datetime.now(timezone.utc)
    logo.modified_by = user_id

    # Update version
    current_version = logo.version
    logo.version = current_version + 1

    # Execute update
    db.commit()
    db.refresh(logo)

    return logo


async def get_logo(
    db: Session, tenant_id: uuid.UUID, logo_id: uuid.UUID
) -> Optional[StorefrontLogo]:
    """
    Get a specific logo by ID.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        logo_id: UUID of the logo

    Returns:
        StorefrontLogo or None if not found

    Raises:
        HTTPException: 404 if tenant not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Get the logo
    logo = (
        db.query(StorefrontLogo)
        .filter(StorefrontLogo.id == logo_id, StorefrontLogo.tenant_id == tenant_id)
        .first()
    )

    return logo


async def list_logos(
    db: Session,
    tenant_id: uuid.UUID,
    logo_type: Optional[LogoType] = None,
    status: Optional[LogoStatus] = None,
    include_expired: bool = False,
    limit: int = 20,
    offset: int = 0,
) -> Tuple[List[StorefrontLogo], int]:
    """
    List logos for a tenant with filtering.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        logo_type: Optional filter by logo type
        status: Optional filter by status
        include_expired: Whether to include expired logos
        limit: Maximum number of logos to return
        offset: Offset for pagination

    Returns:
        Tuple of (list of logos, total count)

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
    query = db.query(StorefrontLogo).filter(StorefrontLogo.tenant_id == tenant_id)

    # Apply logo type filter
    if logo_type:
        query = query.filter(StorefrontLogo.logo_type == logo_type)

    # Apply status filter
    if status:
        query = query.filter(StorefrontLogo.status == status)

    # Filter out expired logos if requested
    if not include_expired:
        now = datetime.now(timezone.utc)
        query = query.filter(
            or_(StorefrontLogo.end_date.is_(None), StorefrontLogo.end_date > now)
        )

    # Get total count
    total_count = query.count()

    # Apply sorting and pagination
    query = query.order_by(desc(StorefrontLogo.created_at))
    query = query.offset(offset).limit(limit)

    # Execute query
    logos = query.all()

    return logos, total_count


async def delete_logo(
    db: Session, tenant_id: uuid.UUID, logo_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    """
    Delete a logo.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        logo_id: UUID of the logo to delete
        user_id: UUID of the user deleting the logo

    Returns:
        True if logo was deleted, False if not found

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
        required_permission="delete",
        section=None,  # For now, using global permission
    )

    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete logos",
        )

    # Get the logo
    logo = (
        db.query(StorefrontLogo)
        .filter(StorefrontLogo.id == logo_id, StorefrontLogo.tenant_id == tenant_id)
        .first()
    )

    if not logo:
        return False

    # Check if this is the only published primary logo
    if logo.logo_type == LogoType.PRIMARY and logo.status == LogoStatus.PUBLISHED:
        primary_count = (
            db.query(StorefrontLogo)
            .filter(
                StorefrontLogo.tenant_id == tenant_id,
                StorefrontLogo.logo_type == LogoType.PRIMARY,
                StorefrontLogo.status == LogoStatus.PUBLISHED,
            )
            .count()
        )

        if primary_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the only published primary logo",
            )

    # Delete the logo
    db.delete(logo)
    db.commit()

    return True


async def publish_logo(
    db: Session, tenant_id: uuid.UUID, logo_id: uuid.UUID, user_id: uuid.UUID
) -> StorefrontLogo:
    """
    Publish a logo.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        logo_id: UUID of the logo to publish
        user_id: UUID of the user publishing the logo

    Returns:
        Published StorefrontLogo

    Raises:
        HTTPException: 404 if tenant, user, or logo not found
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
        section=None,  # For now, using global permission
    )

    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to publish logos",
        )

    # Get the logo
    logo = (
        db.query(StorefrontLogo)
        .filter(StorefrontLogo.id == logo_id, StorefrontLogo.tenant_id == tenant_id)
        .first()
    )

    if not logo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Logo not found"
        )

    # If this is a primary logo, set other published primary logos to inactive
    if logo.logo_type == LogoType.PRIMARY:
        other_primary_logos = (
            db.query(StorefrontLogo)
            .filter(
                StorefrontLogo.tenant_id == tenant_id,
                StorefrontLogo.logo_type == LogoType.PRIMARY,
                StorefrontLogo.status == LogoStatus.PUBLISHED,
                StorefrontLogo.id != logo_id,
            )
            .all()
        )

        for other_logo in other_primary_logos:
            other_logo.status = LogoStatus.INACTIVE

    # Update status to published
    logo.status = LogoStatus.PUBLISHED
    logo.published_at = datetime.now(timezone.utc)
    logo.published_by = user_id
    logo.modified_at = datetime.now(timezone.utc)
    logo.modified_by = user_id

    db.commit()
    db.refresh(logo)

    return logo


async def get_active_logo(
    db: Session, tenant_id: uuid.UUID, logo_type: LogoType
) -> Optional[StorefrontLogo]:
    """
    Get the currently active logo of a specific type.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        logo_type: Type of logo to get

    Returns:
        Active StorefrontLogo or None if not found

    Raises:
        HTTPException: 404 if tenant not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Get current time
    now = datetime.now(timezone.utc)

    # Get the active logo
    logo = (
        db.query(StorefrontLogo)
        .filter(
            StorefrontLogo.tenant_id == tenant_id,
            StorefrontLogo.logo_type == logo_type,
            StorefrontLogo.status == LogoStatus.PUBLISHED,
            or_(StorefrontLogo.start_date.is_(None), StorefrontLogo.start_date <= now),
            or_(StorefrontLogo.end_date.is_(None), StorefrontLogo.end_date > now),
        )
        .order_by(desc(StorefrontLogo.published_at))
        .first()
    )

    return logo
