import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.sql import or_, desc

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

# CRUD operations for banners


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

    # Get the banner
    banner = (
        db.query(StorefrontBanner)
        .filter(
            StorefrontBanner.id == banner_id,
            StorefrontBanner.tenant_id == tenant_id,
        )
        .first()
    )
    if not banner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Banner not found"
        )

    # Check permission
    has_perm = await StorefrontPermissionsService.has_permission(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        required_permission="edit",
        section=None,
    )
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this banner",
        )

    # Check version for optimistic concurrency
    if hasattr(banner, "version") and banner.version != version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Banner was modified by another process. Please reload and try again.",
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
        banner.status = status

    db.commit()
    db.refresh(banner)

    return banner


async def get_banner(
    db: Session, tenant_id: uuid.UUID, banner_id: uuid.UUID
) -> Optional[StorefrontBanner]:
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
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Base query
    query = db.query(StorefrontBanner).filter(
        StorefrontBanner.tenant_id == tenant_id)

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
            or_(StorefrontBanner.end_date.is_(None),
                StorefrontBanner.end_date > now)
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

    # Check permission
    has_perm = await StorefrontPermissionsService.has_permission(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        required_permission="edit",
        section=None,
    )
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this banner",
        )

    db.delete(banner)
    db.commit()
    return True
