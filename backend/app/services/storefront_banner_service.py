import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from app.models.storefront_banner import (
    BannerStatus,
    BannerType,
    StorefrontBanner,
    TargetAudience,
)
from app.models.tenant import Tenant
from app.models.user import User
from app.services.storefront_asset_service import get_asset, track_asset_usage
from app.services.storefront.permissions.storefront_permissions_service import StorefrontPermissionsService


async def create_banner(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    title: str,
    banner_type: BannerType,
    asset_id: uuid.UUID,
    link_url: Optional[str] = None,
    content: Optional[Dict[str, Any]] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    display_order: Optional[int] = None,
    target_audience: Optional[List[TargetAudience]] = None,
    custom_target: Optional[Dict[str, Any]] = None,
    custom_styles: Optional[Dict[str, Any]] = None,
    status: BannerStatus = BannerStatus.DRAFT,
) -> StorefrontBanner:
    """
    Create a new banner for a tenant's storefront.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user creating the banner
        title: Banner title for admin reference
        banner_type: Type of banner
        asset_id: UUID of the asset to use for the banner
        link_url: Optional URL to link to when banner is clicked
        content: Optional additional content for the banner (text, CTA, etc.)
        start_date: Optional date when banner should start displaying
        end_date: Optional date when banner should stop displaying
        display_order: Optional ordering value for multiple banners
        target_audience: Optional list of audience segments to target
        custom_target: Optional custom targeting rules
        custom_styles: Optional custom CSS styles for the banner
        status: Banner status (default: DRAFT)

    Returns:
        Newly created StorefrontBanner

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
            detail="You don't have permission to create banners",
        )

    # Check if asset exists
    asset = await get_asset(db, tenant_id, asset_id)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found"
        )

    # If no display order specified, set it to the end of the list
    if display_order is None:
        max_order = (
            db.query(func.max(StorefrontBanner.display_order))
            .filter(StorefrontBanner.tenant_id == tenant_id)
            .scalar()
            or 0
        )
        display_order = max_order + 10  # Leave gaps for easier reordering

    # Create the banner
    banner = StorefrontBanner(
        tenant_id=tenant_id,
        title=title,
        banner_type=banner_type,
        asset_id=asset_id,
        link_url=link_url,
        content=content or {},
        start_date=start_date,
        end_date=end_date,
        display_order=display_order,
        target_audience=target_audience or [],
        custom_target=custom_target or {},
        custom_styles=custom_styles or {},
        status=status,
        created_by=user_id,
    )

    db.add(banner)
    db.commit()
    db.refresh(banner)

    # Track asset usage
    await track_asset_usage(
        db=db,
        asset_id=asset_id,
        usage_location={"type": "banner", "id": str(banner.id), "name": title},
    )

    return banner


async def update_banner(
    db: Session,
    tenant_id: uuid.UUID,
    banner_id: uuid.UUID,
    user_id: uuid.UUID,
    version: int,
    title: Optional[str] = None,
    asset_id: Optional[uuid.UUID] = None,
    banner_type: Optional[BannerType] = None,
    link_url: Optional[str] = None,
    content: Optional[Dict[str, Any]] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    display_order: Optional[int] = None,
    target_audience: Optional[List[TargetAudience]] = None,
    custom_target: Optional[Dict[str, Any]] = None,
    custom_styles: Optional[Dict[str, Any]] = None,
    status: Optional[BannerStatus] = None,
) -> StorefrontBanner:
    """
    Update an existing banner.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        banner_id: UUID of the banner to update
        user_id: UUID of the user updating the banner
        version: Current version of the banner
        title: Optional new banner title
        asset_id: Optional UUID of the new asset to use
        banner_type: Optional new banner type
        link_url: Optional new URL to link to
        content: Optional new content for the banner
        start_date: Optional new start date
        end_date: Optional new end date
        display_order: Optional new display order
        target_audience: Optional new list of audience segments
        custom_target: Optional new custom targeting rules
        custom_styles: Optional new custom CSS styles
        status: Optional new status

    Returns:
        Updated StorefrontBanner

    Raises:
        HTTPException: 404 if tenant, user, banner, or asset not found
        HTTPException: 403 if user doesn't have permission
        HTTPException: 409 if banner was modified by another process
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
            detail="You don't have permission to update banners",
        )

    # Get the banner
    banner = (
        db.query(StorefrontBanner)
        .filter(
            StorefrontBanner.id == banner_id, StorefrontBanner.tenant_id == tenant_id
        )
        .first()
    )

    if not banner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Banner not found"
        )

    # Check if there's a new asset and it exists
    if asset_id and asset_id != banner.asset_id:
        asset = await get_asset(db, tenant_id, asset_id)
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="New asset not found"
            )

        # Track new asset usage
        await track_asset_usage(
            db=db,
            asset_id=asset_id,
            usage_location={
                "type": "banner",
                "id": str(banner.id),
                "name": banner.title,
            },
        )

    # Update fields if provided
    if title is not None:
        banner.title = title

    if asset_id is not None:
        banner.asset_id = asset_id

    if banner_type is not None:
        banner.banner_type = banner_type

    if link_url is not None:
        banner.link_url = link_url

    if content is not None:
        banner.content = content

    if start_date is not None:
        banner.start_date = start_date

    if end_date is not None:
        banner.end_date = end_date

    if display_order is not None:
        banner.display_order = display_order

    if target_audience is not None:
        banner.target_audience = target_audience

    if custom_target is not None:
        banner.custom_target = custom_target

    if custom_styles is not None:
        banner.custom_styles = custom_styles

    if status is not None:
        # If transitioning to published, track that
        if status == BannerStatus.PUBLISHED and banner.status != BannerStatus.PUBLISHED:
            banner.published_at = datetime.now(timezone.utc)
            banner.published_by = user_id

        banner.status = status

    # Update modified_at timestamp
    banner.modified_at = datetime.now(timezone.utc)
    banner.modified_by = user_id

    # Update version
    banner.version = version + 1

    # Execute update
    db.commit()
    db.refresh(banner)

    return banner


async def get_banner(
    db: Session, tenant_id: uuid.UUID, banner_id: uuid.UUID
) -> Optional[StorefrontBanner]:
    """
    Get a specific banner by ID.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        banner_id: UUID of the banner

    Returns:
        StorefrontBanner or None if not found

    Raises:
        HTTPException: 404 if tenant not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Get the banner
    banner = (
        db.query(StorefrontBanner)
        .filter(
            StorefrontBanner.id == banner_id, StorefrontBanner.tenant_id == tenant_id
        )
        .first()
    )

    return banner


async def list_banners(
    db: Session,
    tenant_id: uuid.UUID,
    status: Optional[BannerStatus] = None,
    banner_type: Optional[BannerType] = None,
    include_expired: bool = False,
    limit: int = 20,
    offset: int = 0,
) -> Tuple[List[StorefrontBanner], int]:
    """
    List banners for a tenant with filtering.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        status: Optional filter by status
        banner_type: Optional filter by banner type
        include_expired: Whether to include expired banners
        limit: Maximum number of banners to return
        offset: Offset for pagination

    Returns:
        Tuple of (list of banners, total count)

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
    query = db.query(StorefrontBanner).filter(StorefrontBanner.tenant_id == tenant_id)

    # Apply status filter
    if status:
        query = query.filter(StorefrontBanner.status == status)

    # Apply banner type filter
    if banner_type:
        query = query.filter(StorefrontBanner.banner_type == banner_type)

    # Filter out expired banners if requested
    if not include_expired:
        now = datetime.now(timezone.utc)
        query = query.filter(
            or_(StorefrontBanner.end_date.is_(None), StorefrontBanner.end_date > now)
        )

    # Get total count
    total_count = query.count()

    # Apply sorting and pagination
    query = query.order_by(
        StorefrontBanner.display_order, desc(StorefrontBanner.created_at)
    )
    query = query.offset(offset).limit(limit)

    # Execute query
    banners = query.all()

    return banners, total_count


async def delete_banner(
    db: Session, tenant_id: uuid.UUID, banner_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    """
    Delete a banner.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        banner_id: UUID of the banner to delete
        user_id: UUID of the user deleting the banner

    Returns:
        True if banner was deleted, False if not found

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
            detail="You don't have permission to delete banners",
        )

    # Get the banner
    banner = (
        db.query(StorefrontBanner)
        .filter(
            StorefrontBanner.id == banner_id, StorefrontBanner.tenant_id == tenant_id
        )
        .first()
    )

    if not banner:
        return False

    # Delete the banner
    db.delete(banner)
    db.commit()

    return True


async def reorder_banners(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    banner_order: List[Dict[str, Any]],
) -> List[StorefrontBanner]:
    """
    Reorder multiple banners.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user reordering the banners
        banner_order: List of dictionaries with banner_id and display_order

    Returns:
        List of updated banners

    Raises:
        HTTPException: 404 if tenant or user not found
        HTTPException: 403 if user doesn't have permission
        HTTPException: 400 if banner_order is invalid
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
            detail="You don't have permission to reorder banners",
        )

    # Validate banner_order
    if not banner_order or not isinstance(banner_order, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="banner_order must be a non-empty list",
        )

    # Extract banner IDs
    banner_ids = [
        entry.get("banner_id") for entry in banner_order if entry.get("banner_id")
    ]

    # Get all banners in one query
    banners = (
        db.query(StorefrontBanner)
        .filter(
            StorefrontBanner.tenant_id == tenant_id, StorefrontBanner.id.in_(banner_ids)
        )
        .all()
    )

    # Create a lookup map
    banner_map = {str(banner.id): banner for banner in banners}

    # Update display order
    for entry in banner_order:
        banner_id = entry.get("banner_id")
        display_order = entry.get("display_order")

        if not banner_id or display_order is None:
            continue

        banner = banner_map.get(str(banner_id))
        if banner:
            banner.display_order = display_order
            banner.modified_at = datetime.now(timezone.utc)
            banner.modified_by = user_id

    db.commit()

    # Refresh all banners to get updated values
    for banner in banners:
        db.refresh(banner)

    return banners


async def publish_banner(
    db: Session, tenant_id: uuid.UUID, banner_id: uuid.UUID, user_id: uuid.UUID
) -> StorefrontBanner:
    """
    Publish a banner.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        banner_id: UUID of the banner to publish
        user_id: UUID of the user publishing the banner

    Returns:
        Published StorefrontBanner

    Raises:
        HTTPException: 404 if tenant, user, or banner not found
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
            detail="You don't have permission to publish banners",
        )

    # Get the banner
    banner = (
        db.query(StorefrontBanner)
        .filter(
            StorefrontBanner.id == banner_id, StorefrontBanner.tenant_id == tenant_id
        )
        .first()
    )

    if not banner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Banner not found"
        )

    # Update status to published
    banner.status = BannerStatus.PUBLISHED
    banner.published_at = datetime.now(timezone.utc)
    banner.published_by = user_id
    banner.modified_at = datetime.now(timezone.utc)
    banner.modified_by = user_id

    db.commit()
    db.refresh(banner)

    return banner


async def get_active_banners(
    db: Session,
    tenant_id: uuid.UUID,
    banner_type: Optional[BannerType] = None,
    audience_context: Optional[Dict[str, Any]] = None,
) -> List[StorefrontBanner]:
    """
    Get active banners that should be displayed based on current date and targeting rules.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        banner_type: Optional filter by banner type
        audience_context: Optional context for audience targeting

    Returns:
        List of active banners to display

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

    # Base query for published banners that are active based on dates
    query = db.query(StorefrontBanner).filter(
        StorefrontBanner.tenant_id == tenant_id,
        StorefrontBanner.status == BannerStatus.PUBLISHED,
        or_(StorefrontBanner.start_date.is_(None), StorefrontBanner.start_date <= now),
        or_(StorefrontBanner.end_date.is_(None), StorefrontBanner.end_date > now),
    )

    # Apply banner type filter
    if banner_type:
        query = query.filter(StorefrontBanner.banner_type == banner_type)

    # Get all potentially active banners
    potential_banners = query.order_by(StorefrontBanner.display_order).all()

    # Apply audience targeting if context is provided
    if audience_context:
        # This is a simplified implementation - in a real system, this would
        # involve more complex logic to match audience segments
        filtered_banners = []
        for banner in potential_banners:
            # If no targeting is specified, include the banner
            if not banner.target_audience and not banner.custom_target:
                filtered_banners.append(banner)
                continue

            # Check each audience segment
            if banner.target_audience:
                # Simple targeting check
                for audience in banner.target_audience:
                    if audience.value == "NEW_USERS" and audience_context.get(
                        "is_new_user"
                    ):
                        filtered_banners.append(banner)
                        break
                    elif (
                        audience.value == "RETURNING_USERS"
                        and not audience_context.get("is_new_user")
                    ):
                        filtered_banners.append(banner)
                        break
                    elif (
                        audience.value == "MOBILE"
                        and audience_context.get("device_type") == "mobile"
                    ):
                        filtered_banners.append(banner)
                        break
                    # Add more audience checks as needed

            # Check custom targeting rules
            # This would be more complex in a real implementation

        return filtered_banners
    else:
        # No audience context, just return all potential banners
        return potential_banners
