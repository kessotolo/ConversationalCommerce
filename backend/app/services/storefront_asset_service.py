from typing import List, Optional, Dict, Any, Tuple, BinaryIO
import uuid
import os
import shutil
from pathlib import Path
import mimetypes
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, func
from fastapi import HTTPException, status, UploadFile, File
from app.models.storefront_asset import StorefrontAsset, AssetType
from app.models.tenant import Tenant
from app.models.user import User
from app.services.storefront_permissions_service import has_permission
from PIL import Image
import io

# Configuration
UPLOAD_BASE_DIR = os.getenv("ASSET_UPLOAD_DIR", "/tmp/storefront_assets")
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
ALLOWED_DOCUMENT_TYPES = ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"]
ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/ogg", "audio/wav"]
CDN_BASE_URL = os.getenv("CDN_BASE_URL", "")  # e.g., "https://cdn.yourplatform.com"


async def upload_asset(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    file: UploadFile,
    asset_type: Optional[AssetType] = None,
    title: Optional[str] = None,
    alt_text: Optional[str] = None,
    description: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> StorefrontAsset:
    """
    Upload and store a new asset for a tenant.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user uploading the asset
        file: File to upload
        asset_type: Type of asset (auto-detected if not provided)
        title: Optional title for the asset
        alt_text: Optional alt text for the asset
        description: Optional description for the asset
        metadata: Optional additional metadata
        
    Returns:
        Newly created StorefrontAsset
        
    Raises:
        HTTPException: 404 if tenant or user not found
        HTTPException: 403 if user doesn't have permission
        HTTPException: 400 if file type not allowed or file too large
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check permission
    has_perm = await has_permission(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        required_permission="edit",
        section=None  # For now, using global permission
    )
    
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to upload assets"
        )
    
    # Get file content and size
    file_content = await file.read()
    file_size = len(file_content)
    
    # Check file size
    max_size_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE_MB}MB"
        )
    
    # Detect MIME type
    mime_type = file.content_type
    if not mime_type:
        mime_type, _ = mimetypes.guess_type(file.filename)
        if not mime_type:
            mime_type = "application/octet-stream"
    
    # Determine asset type if not provided
    if not asset_type:
        if mime_type in ALLOWED_IMAGE_TYPES:
            asset_type = AssetType.IMAGE
        elif mime_type in ALLOWED_VIDEO_TYPES:
            asset_type = AssetType.VIDEO
        elif mime_type in ALLOWED_DOCUMENT_TYPES:
            asset_type = AssetType.DOCUMENT
        elif mime_type in ALLOWED_AUDIO_TYPES:
            asset_type = AssetType.AUDIO
        else:
            asset_type = AssetType.OTHER
    
    # Validate file type against asset type
    allowed_types = []
    if asset_type == AssetType.IMAGE:
        allowed_types = ALLOWED_IMAGE_TYPES
    elif asset_type == AssetType.VIDEO:
        allowed_types = ALLOWED_VIDEO_TYPES
    elif asset_type == AssetType.DOCUMENT:
        allowed_types = ALLOWED_DOCUMENT_TYPES
    elif asset_type == AssetType.AUDIO:
        allowed_types = ALLOWED_AUDIO_TYPES
    
    if allowed_types and mime_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{mime_type}' not allowed for asset type {asset_type.value}"
        )
    
    # Generate a unique filename
    original_filename = file.filename
    file_ext = Path(original_filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    
    # Create tenant-specific directory structure
    tenant_dir = f"{UPLOAD_BASE_DIR}/{tenant_id}/{asset_type.value}"
    os.makedirs(tenant_dir, exist_ok=True)
    
    # Save the file
    file_path = f"{tenant_dir}/{unique_filename}"
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Get image dimensions and other metadata
    additional_metadata = metadata or {}
    if asset_type == AssetType.IMAGE:
        try:
            with Image.open(io.BytesIO(file_content)) as img:
                width, height = img.size
                additional_metadata.update({
                    "width": width,
                    "height": height,
                    "format": img.format,
                    "mode": img.mode
                })
        except Exception as e:
            print(f"Error processing image metadata: {e}")
    
    # Relative path for storage in database
    relative_path = f"{tenant_id}/{asset_type.value}/{unique_filename}"
    
    # Create asset record
    asset = StorefrontAsset(
        tenant_id=tenant_id,
        filename=unique_filename,
        original_filename=original_filename,
        file_path=relative_path,
        file_size=file_size,
        mime_type=mime_type,
        asset_type=asset_type,
        alt_text=alt_text,
        title=title or original_filename,
        description=description,
        metadata=additional_metadata,
        is_active=True,
        is_optimized=False
    )
    
    db.add(asset)
    db.commit()
    db.refresh(asset)
    
    # Queue image optimization if needed
    if asset_type == AssetType.IMAGE:
        # In a real implementation, this would queue a background task
        # For now, we'll just mark it as a TODO
        pass
    
    # Reset file position for further reads
    await file.seek(0)
    
    return asset


async def get_assets(
    db: Session,
    tenant_id: uuid.UUID,
    asset_type: Optional[AssetType] = None,
    search_query: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    sort_by: str = "created_at",
    sort_desc: bool = True
) -> Tuple[List[StorefrontAsset], int]:
    """
    Get assets for a tenant with filtering and sorting.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        asset_type: Optional filter by asset type
        search_query: Optional search query
        limit: Maximum number of assets to return
        offset: Offset for pagination
        sort_by: Field to sort by
        sort_desc: Sort in descending order if True
        
    Returns:
        Tuple of (list of assets, total count)
        
    Raises:
        HTTPException: 404 if tenant not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Base query
    query = db.query(StorefrontAsset).filter(
        StorefrontAsset.tenant_id == tenant_id,
        StorefrontAsset.is_active == True
    )
    
    # Apply asset type filter
    if asset_type:
        query = query.filter(StorefrontAsset.asset_type == asset_type)
    
    # Apply search query
    if search_query:
        search_terms = f"%{search_query}%"
        query = query.filter(
            or_(
                StorefrontAsset.title.ilike(search_terms),
                StorefrontAsset.description.ilike(search_terms),
                StorefrontAsset.original_filename.ilike(search_terms),
                StorefrontAsset.alt_text.ilike(search_terms)
            )
        )
    
    # Get total count
    total_count = query.count()
    
    # Apply sorting
    if sort_by == "created_at":
        order_by = desc(StorefrontAsset.created_at) if sort_desc else StorefrontAsset.created_at
    elif sort_by == "file_size":
        order_by = desc(StorefrontAsset.file_size) if sort_desc else StorefrontAsset.file_size
    elif sort_by == "title":
        order_by = desc(StorefrontAsset.title) if sort_desc else StorefrontAsset.title
    else:
        order_by = desc(StorefrontAsset.created_at)
    
    query = query.order_by(order_by)
    
    # Apply pagination
    query = query.offset(offset).limit(limit)
    
    # Execute query
    assets = query.all()
    
    return assets, total_count


async def get_asset(
    db: Session,
    tenant_id: uuid.UUID,
    asset_id: uuid.UUID
) -> Optional[StorefrontAsset]:
    """
    Get a specific asset by ID.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        asset_id: UUID of the asset
        
    Returns:
        StorefrontAsset or None if not found
        
    Raises:
        HTTPException: 404 if tenant not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Get the asset
    asset = db.query(StorefrontAsset).filter(
        StorefrontAsset.id == asset_id,
        StorefrontAsset.tenant_id == tenant_id,
        StorefrontAsset.is_active == True
    ).first()
    
    return asset


async def update_asset(
    db: Session,
    tenant_id: uuid.UUID,
    asset_id: uuid.UUID,
    user_id: uuid.UUID,
    title: Optional[str] = None,
    alt_text: Optional[str] = None,
    description: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[StorefrontAsset]:
    """
    Update asset metadata.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        asset_id: UUID of the asset
        user_id: UUID of the user updating the asset
        title: Optional new title
        alt_text: Optional new alt text
        description: Optional new description
        metadata: Optional new metadata (merged with existing)
        
    Returns:
        Updated StorefrontAsset or None if not found
        
    Raises:
        HTTPException: 404 if tenant, user, or asset not found
        HTTPException: 403 if user doesn't have permission
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check permission
    has_perm = await has_permission(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        required_permission="edit",
        section=None  # For now, using global permission
    )
    
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update assets"
        )
    
    # Get the asset
    asset = db.query(StorefrontAsset).filter(
        StorefrontAsset.id == asset_id,
        StorefrontAsset.tenant_id == tenant_id,
        StorefrontAsset.is_active == True
    ).first()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    # Update fields if provided
    if title is not None:
        asset.title = title
    
    if alt_text is not None:
        asset.alt_text = alt_text
    
    if description is not None:
        asset.description = description
    
    if metadata is not None:
        # Merge with existing metadata
        asset.metadata = {**asset.metadata, **metadata}
    
    db.commit()
    db.refresh(asset)
    
    return asset


async def delete_asset(
    db: Session,
    tenant_id: uuid.UUID,
    asset_id: uuid.UUID,
    user_id: uuid.UUID
) -> bool:
    """
    Delete an asset (soft delete).
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        asset_id: UUID of the asset
        user_id: UUID of the user deleting the asset
        
    Returns:
        True if asset was deleted, False if not found
        
    Raises:
        HTTPException: 404 if tenant or user not found
        HTTPException: 403 if user doesn't have permission
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check permission
    has_perm = await has_permission(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        required_permission="delete",
        section=None  # For now, using global permission
    )
    
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete assets"
        )
    
    # Get the asset
    asset = db.query(StorefrontAsset).filter(
        StorefrontAsset.id == asset_id,
        StorefrontAsset.tenant_id == tenant_id,
        StorefrontAsset.is_active == True
    ).first()
    
    if not asset:
        return False
    
    # Soft delete by marking as inactive
    asset.is_active = False
    
    db.commit()
    
    return True


async def optimize_image(
    db: Session,
    tenant_id: uuid.UUID,
    asset_id: uuid.UUID
) -> Optional[StorefrontAsset]:
    """
    Optimize an image asset by creating multiple resolutions.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        asset_id: UUID of the asset
        
    Returns:
        Updated StorefrontAsset or None if not found
        
    Raises:
        HTTPException: 404 if tenant or asset not found
        HTTPException: 400 if asset is not an image
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Get the asset
    asset = db.query(StorefrontAsset).filter(
        StorefrontAsset.id == asset_id,
        StorefrontAsset.tenant_id == tenant_id,
        StorefrontAsset.is_active == True
    ).first()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    # Check if asset is an image
    if asset.asset_type != AssetType.IMAGE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image assets can be optimized"
        )
    
    # Get the full file path
    file_path = f"{UPLOAD_BASE_DIR}/{asset.file_path}"
    
    try:
        # Open the image
        with Image.open(file_path) as img:
            # Extract file name and extension
            path = Path(file_path)
            file_stem = path.stem
            file_ext = path.suffix
            directory = path.parent
            
            # Create optimized versions at different resolutions
            resolutions = [(1200, 1200), (800, 800), (400, 400), (200, 200)]
            optimized_files = {}
            
            for width, height in resolutions:
                # Resize image maintaining aspect ratio
                img_copy = img.copy()
                img_copy.thumbnail((width, height), Image.LANCZOS)
                
                # Save optimized version
                optimized_filename = f"{file_stem}_{width}x{height}{file_ext}"
                optimized_path = f"{directory}/{optimized_filename}"
                img_copy.save(optimized_path, optimize=True, quality=85)
                
                # Store relative path
                relative_path = f"{tenant_id}/{asset.asset_type.value}/{optimized_filename}"
                optimized_files[f"{width}x{height}"] = relative_path
            
            # Update asset metadata with optimized versions
            asset.metadata = {
                **asset.metadata,
                "optimized": True,
                "optimized_versions": optimized_files
            }
            
            asset.is_optimized = True
            
            db.commit()
            db.refresh(asset)
            
            return asset
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error optimizing image: {str(e)}"
        )


async def get_asset_url(
    asset: StorefrontAsset,
    width: Optional[int] = None,
    height: Optional[int] = None
) -> str:
    """
    Get the URL for an asset, optionally at a specific resolution.
    
    Args:
        asset: StorefrontAsset
        width: Optional desired width
        height: Optional desired height
        
    Returns:
        URL for the asset
    """
    # Base file path
    file_path = asset.file_path
    
    # Check if optimized versions are available
    if asset.is_optimized and width and height and asset.asset_type == AssetType.IMAGE:
        optimized_versions = asset.metadata.get("optimized_versions", {})
        
        # Find the closest optimized version
        available_resolutions = []
        for key in optimized_versions:
            try:
                w, h = map(int, key.split("x"))
                available_resolutions.append((w, h, key))
            except ValueError:
                continue
        
        if available_resolutions:
            # Sort by closest area to requested dimensions
            target_area = width * height
            available_resolutions.sort(key=lambda x: abs(x[0] * x[1] - target_area))
            
            # Use the closest resolution
            closest_key = available_resolutions[0][2]
            file_path = optimized_versions[closest_key]
    
    # Construct URL
    if CDN_BASE_URL:
        return f"{CDN_BASE_URL}/{file_path}"
    else:
        return f"/assets/{file_path}"


async def track_asset_usage(
    db: Session,
    asset_id: uuid.UUID,
    usage_location: Dict[str, Any]
) -> StorefrontAsset:
    """
    Track where an asset is being used.
    
    Args:
        db: Database session
        asset_id: UUID of the asset
        usage_location: Dictionary describing where the asset is used
        
    Returns:
        Updated StorefrontAsset
        
    Raises:
        HTTPException: 404 if asset not found
    """
    # Get the asset
    asset = db.query(StorefrontAsset).filter(
        StorefrontAsset.id == asset_id,
        StorefrontAsset.is_active == True
    ).first()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    # Update usage locations
    usage_locations = asset.usage_locations.copy() if asset.usage_locations else []
    
    # Add timestamp to usage location
    usage_location["tracked_at"] = datetime.now(timezone.utc).isoformat()
    
    # Check if this location is already tracked
    location_type = usage_location.get("type")
    location_id = usage_location.get("id")
    
    if location_type and location_id:
        # Remove existing entry for this location if it exists
        usage_locations = [
            loc for loc in usage_locations 
            if not (loc.get("type") == location_type and loc.get("id") == location_id)
        ]
    
    # Add the new usage location
    usage_locations.append(usage_location)
    
    # Update the asset
    asset.usage_locations = usage_locations
    asset.usage_count = len(usage_locations)
    
    db.commit()
    db.refresh(asset)
    
    return asset


async def cleanup_unused_assets(
    db: Session,
    tenant_id: uuid.UUID,
    older_than_days: int = 30
) -> int:
    """
    Clean up unused assets.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        older_than_days: Only delete assets older than this many days
        
    Returns:
        Number of assets cleaned up
        
    Raises:
        HTTPException: 404 if tenant not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Calculate cutoff date
    cutoff_date = datetime.now(timezone.utc) - datetime.timedelta(days=older_than_days)
    
    # Find unused assets
    unused_assets = db.query(StorefrontAsset).filter(
        StorefrontAsset.tenant_id == tenant_id,
        StorefrontAsset.is_active == True,
        StorefrontAsset.usage_count == 0,
        StorefrontAsset.created_at < cutoff_date
    ).all()
    
    count = 0
    for asset in unused_assets:
        # Soft delete the asset
        asset.is_active = False
        count += 1
    
    db.commit()
    
    return count
