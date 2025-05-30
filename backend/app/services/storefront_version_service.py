from typing import List, Optional, Dict, Any, Tuple
import uuid
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status
from app.models.storefront import StorefrontConfig
from app.models.storefront_version import StorefrontVersion
from app.models.tenant import Tenant
from app.models.user import User
from deepdiff import DeepDiff

async def create_version(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    change_summary: Optional[str] = None,
    change_description: Optional[str] = None,
    tags: Optional[List[str]] = None
) -> StorefrontVersion:
    """
    Create a snapshot of the current storefront configuration as a new version.
    
    This function creates a point-in-time snapshot of the storefront configuration
    that can be used for versioning, rollback, and audit purposes.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user creating the version
        change_summary: Short summary of the changes (e.g., "Updated theme colors")
        change_description: Detailed description of the changes
        tags: Optional list of tags to categorize the version
        
    Returns:
        Newly created StorefrontVersion
        
    Raises:
        HTTPException: 404 if tenant, user, or storefront config not found
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
    
    # Get the storefront config
    config = db.query(StorefrontConfig).filter(StorefrontConfig.tenant_id == tenant_id).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storefront configuration not found"
        )
    
    # Get the latest version number
    latest_version = db.query(StorefrontVersion).filter(
        StorefrontVersion.storefront_config_id == config.id
    ).order_by(desc(StorefrontVersion.version_number)).first()
    
    new_version_number = 1
    if latest_version:
        new_version_number = latest_version.version_number + 1
    
    # Create a snapshot of the configuration
    config_dict = {
        "id": str(config.id),
        "tenant_id": str(config.tenant_id),
        "subdomain_name": config.subdomain_name,
        "custom_domain": config.custom_domain,
        "domain_verified": config.domain_verified,
        "status": config.status.value if config.status else None,
        "meta_title": config.meta_title,
        "meta_description": config.meta_description,
        "theme_settings": config.theme_settings,
        "layout_config": config.layout_config,
        "social_links": config.social_links,
        "published_at": config.published_at.isoformat() if config.published_at else None,
        "scheduled_publish_at": config.scheduled_publish_at.isoformat() if config.scheduled_publish_at else None,
        "published_by": str(config.published_by) if config.published_by else None,
        "version_created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Create the version record
    version = StorefrontVersion(
        storefront_config_id=config.id,
        version_number=new_version_number,
        created_by=user_id,
        change_summary=change_summary,
        change_description=change_description,
        tags=tags or [],
        configuration_snapshot=config_dict
    )
    
    db.add(version)
    db.commit()
    db.refresh(version)
    
    return version


async def list_versions(
    db: Session,
    tenant_id: uuid.UUID,
    limit: int = 10,
    offset: int = 0,
    tags: Optional[List[str]] = None
) -> Tuple[List[StorefrontVersion], int]:
    """
    Get version history for a tenant's storefront configuration.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        limit: Maximum number of versions to return
        offset: Offset for pagination
        tags: Optional list of tags to filter versions
        
    Returns:
        Tuple of (list of versions, total count)
        
    Raises:
        HTTPException: 404 if tenant or storefront config not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Get the storefront config
    config = db.query(StorefrontConfig).filter(StorefrontConfig.tenant_id == tenant_id).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storefront configuration not found"
        )
    
    # Base query
    query = db.query(StorefrontVersion).filter(
        StorefrontVersion.storefront_config_id == config.id
    )
    
    # Add tag filtering if specified
    if tags and len(tags) > 0:
        # This is a simplification - actual JSON array containment would depend on your database
        # For PostgreSQL you might use the @> operator
        # query = query.filter(StorefrontVersion.tags.contains(tags))
        pass
    
    # Get total count
    total_count = query.count()
    
    # Get versions with pagination
    versions = query.order_by(desc(StorefrontVersion.created_at)).offset(offset).limit(limit).all()
    
    return versions, total_count


async def get_version(
    db: Session,
    tenant_id: uuid.UUID,
    version_id: uuid.UUID
) -> Optional[StorefrontVersion]:
    """
    Get a specific version by ID.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        version_id: UUID of the version to retrieve
        
    Returns:
        StorefrontVersion or None if not found
        
    Raises:
        HTTPException: 404 if tenant or storefront config not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Get the storefront config
    config = db.query(StorefrontConfig).filter(StorefrontConfig.tenant_id == tenant_id).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storefront configuration not found"
        )
    
    # Get the version
    version = db.query(StorefrontVersion).filter(
        StorefrontVersion.id == version_id,
        StorefrontVersion.storefront_config_id == config.id
    ).first()
    
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Version not found"
        )
    
    return version


async def restore_version(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    version_id: uuid.UUID
) -> StorefrontConfig:
    """
    Restore a storefront configuration to a previous version.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user performing the restore
        version_id: UUID of the version to restore
        
    Returns:
        Updated StorefrontConfig
        
    Raises:
        HTTPException: 404 if tenant, user, storefront config, or version not found
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
    
    # Get the storefront config
    config = db.query(StorefrontConfig).filter(StorefrontConfig.tenant_id == tenant_id).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storefront configuration not found"
        )
    
    # Get the version
    version = db.query(StorefrontVersion).filter(
        StorefrontVersion.id == version_id,
        StorefrontVersion.storefront_config_id == config.id
    ).first()
    
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Version not found"
        )
    
    # Create a new version of the current config before restoring
    await create_version(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        change_summary="Auto-saved before version restore",
        change_description=f"Automatic snapshot created before restoring to version {version.version_number}"
    )
    
    # Restore the configuration data from the snapshot
    snapshot = version.configuration_snapshot
    
    # Update configuration properties from the snapshot
    config.subdomain_name = snapshot.get("subdomain_name", config.subdomain_name)
    config.custom_domain = snapshot.get("custom_domain", config.custom_domain)
    config.meta_title = snapshot.get("meta_title", config.meta_title)
    config.meta_description = snapshot.get("meta_description", config.meta_description)
    config.theme_settings = snapshot.get("theme_settings", config.theme_settings)
    config.layout_config = snapshot.get("layout_config", config.layout_config)
    config.social_links = snapshot.get("social_links", config.social_links)
    
    db.commit()
    db.refresh(config)
    
    # Create a new version to record the restore action
    await create_version(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        change_summary=f"Restored to version {version.version_number}",
        change_description=f"Configuration restored to version {version.version_number} created on {version.created_at}",
        tags=["restore", f"version-{version.version_number}"]
    )
    
    return config


async def compare_versions(
    db: Session,
    tenant_id: uuid.UUID,
    version_id1: uuid.UUID,
    version_id2: uuid.UUID
) -> Dict[str, Any]:
    """
    Compare two versions and generate a diff of the changes.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        version_id1: UUID of the first version
        version_id2: UUID of the second version
        
    Returns:
        Dictionary containing the differences between versions
        
    Raises:
        HTTPException: 404 if tenant, storefront config, or versions not found
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Get the storefront config
    config = db.query(StorefrontConfig).filter(StorefrontConfig.tenant_id == tenant_id).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storefront configuration not found"
        )
    
    # Get the first version
    version1 = db.query(StorefrontVersion).filter(
        StorefrontVersion.id == version_id1,
        StorefrontVersion.storefront_config_id == config.id
    ).first()
    
    if not version1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version {version_id1} not found"
        )
    
    # Get the second version
    version2 = db.query(StorefrontVersion).filter(
        StorefrontVersion.id == version_id2,
        StorefrontVersion.storefront_config_id == config.id
    ).first()
    
    if not version2:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version {version_id2} not found"
        )
    
    # Compare the two snapshots
    diff = DeepDiff(
        version1.configuration_snapshot,
        version2.configuration_snapshot,
        ignore_order=True,
        verbose_level=2
    )
    
    # Prepare a more readable diff result
    result = {
        "metadata": {
            "version1": {
                "id": str(version1.id),
                "number": version1.version_number,
                "created_at": version1.created_at.isoformat(),
                "created_by": str(version1.created_by),
                "summary": version1.change_summary
            },
            "version2": {
                "id": str(version2.id),
                "number": version2.version_number,
                "created_at": version2.created_at.isoformat(),
                "created_by": str(version2.created_by),
                "summary": version2.change_summary
            }
        },
        "differences": diff,
        "summary": {
            "added": len(diff.get("dictionary_item_added", [])),
            "removed": len(diff.get("dictionary_item_removed", [])),
            "changed": len(diff.get("values_changed", [])),
            "type_changes": len(diff.get("type_changes", []))
        }
    }
    
    return result
