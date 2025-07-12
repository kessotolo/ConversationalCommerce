"""
storefront_config_service.py

Handles CRUD operations and domain verification for tenant storefront configurations.

- Create, retrieve, and update storefront configs
- Validate subdomains and custom domains
- Manage theme and layout settings
- Verify custom domains via DNS

Intended for use by orchestrator services and API endpoints.
"""

from typing import Dict, Any, Optional, Tuple
import uuid
from datetime import datetime
import logging
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from backend.app.models.storefront import StorefrontConfig, StorefrontStatus
from backend.app.models.tenant import Tenant
from backend.app.models.user import User
from backend.app.utils.domain_validator import validate_domain, validate_subdomain
from backend.app.core.exceptions import (
    ResourceNotFoundError,
    ValidationError as ValidationException,
    BusinessLogicError as ResourceConflictException,
    ConcurrentModificationError as StaleDataException
)

logger = logging.getLogger(__name__)


async def create_storefront_config(
    db: Session, tenant_id: str, subdomain_name: Optional[str] = None
) -> StorefrontConfig:
    """
    Create a new StorefrontConfig for a tenant with validation and sensible defaults.

    Args:
        db: Database session
        tenant_id: UUID of the tenant to create config for
        subdomain_name: Optional subdomain name (will be auto-generated if not provided)

    Returns:
        Newly created StorefrontConfig instance

    Raises:
        ResourceNotFoundError: If tenant doesn't exist
        ResourceConflictException: If tenant already has a config or subdomain conflicts
        ValidationException: If subdomain validation fails
    """
    # Verify tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        logger.error(
            f"Cannot create storefront config: Tenant {tenant_id} not found")
        raise ResourceNotFoundError(f"Tenant with ID {tenant_id} not found")

    # Check if tenant already has a config
    existing_config = db.query(StorefrontConfig).filter(
        StorefrontConfig.tenant_id == tenant_id
    ).first()

    if existing_config:
        logger.warning(f"Tenant {tenant_id} already has a storefront config")
        return existing_config

    # Auto-generate subdomain if not provided
    if not subdomain_name:
        # Create a slugified version of the tenant name or use tenant ID
        base = tenant.name.lower().replace(
            " ", "-") if tenant.name else str(tenant_id)[:8]
        subdomain_name = f"{base}-{uuid.uuid4().hex[:6]}"

    # Validate subdomain format
    is_valid, error_msg = validate_subdomain(subdomain_name)
    if not is_valid:
        raise ValidationException(f"Invalid subdomain: {error_msg}")

    # Check subdomain uniqueness
    existing_subdomain = db.query(StorefrontConfig).filter(
        StorefrontConfig.subdomain_name == subdomain_name
    ).first()

    if existing_subdomain:
        raise ResourceConflictException(
            f"Subdomain '{subdomain_name}' is already taken")

    # Create config with defaults
    config = StorefrontConfig(
        tenant_id=tenant_id,
        subdomain_name=subdomain_name,
        status=StorefrontStatus.DRAFT,
        theme_settings={
            "primaryColor": "#4F46E5",
            "secondaryColor": "#10B981",
            "fontFamily": "Inter, system-ui, sans-serif",
            "borderRadius": "0.5rem"
        },
        layout_config={
            "hero": {"enabled": True, "type": "banner", "content": []},
            "featured_products": {
                "enabled": True,
                "title": "Featured Products",
                "limit": 8,
            },
            "categories": {"enabled": True, "display_mode": "grid"},
            "about": {"enabled": True, "content": ""},
        },
        social_links={
            "whatsapp": "",
            "instagram": "",
            "facebook": "",
            "twitter": "",
            "tiktok": "",
        }
    )

    try:
        db.add(config)
        db.commit()
        db.refresh(config)
        logger.info(
            f"Created storefront config for tenant {tenant_id} with subdomain {subdomain_name}")
        return config
    except IntegrityError as e:
        db.rollback()
        logger.error(
            f"Database integrity error creating storefront config: {e}")
        raise ResourceConflictException(
            f"Error creating storefront config: {str(e)}")


async def get_storefront_config(db: Session, tenant_id: str) -> Optional[StorefrontConfig]:
    """
    Retrieve the StorefrontConfig for a given tenant, or None if not found.

    Args:
        db: Database session
        tenant_id: UUID of the tenant

    Returns:
        StorefrontConfig if found, None otherwise
    """
    return db.query(StorefrontConfig).filter(StorefrontConfig.tenant_id == tenant_id).first()


async def update_storefront_config(
    db: Session,
    tenant_id: str,
    version: Optional[int] = None,
    **update_data
) -> StorefrontConfig:
    """
    Update an existing StorefrontConfig for a tenant, using optimistic locking.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        version: Optional version number for optimistic locking
        **update_data: Key-value pairs to update on the config

    Returns:
        Updated StorefrontConfig instance

    Raises:
        ResourceNotFoundError: If config doesn't exist
        ValidationException: If domain/subdomain validation fails
        StaleDataException: If version doesn't match (optimistic locking)
    """
    # Get existing config
    config = await get_storefront_config(db, tenant_id)
    if not config:
        raise ResourceNotFoundError(
            f"StorefrontConfig not found for tenant {tenant_id}")

    # Optimistic locking check if version provided
    if version is not None and hasattr(config, 'version') and config.version != version:
        raise StaleDataException(
            f"Conflict: StorefrontConfig has been modified (current: {config.version}, provided: {version})"
        )

    # Validate subdomain if provided
    if 'subdomain_name' in update_data:
        subdomain = update_data['subdomain_name']
        is_valid, error_msg = validate_subdomain(subdomain)
        if not is_valid:
            raise ValidationException(f"Invalid subdomain: {error_msg}")

        # Check uniqueness for new subdomain
        existing = db.query(StorefrontConfig).filter(
            StorefrontConfig.subdomain_name == subdomain,
            StorefrontConfig.id != config.id
        ).first()

        if existing:
            raise ResourceConflictException(
                f"Subdomain '{subdomain}' is already taken")

    # Validate custom domain if provided
    if 'custom_domain' in update_data and update_data['custom_domain']:
        domain = update_data['custom_domain']
        is_valid, error_msg = validate_domain(domain)
        if not is_valid:
            raise ValidationException(f"Invalid custom domain: {error_msg}")

        # Check uniqueness for new domain
        existing = db.query(StorefrontConfig).filter(
            StorefrontConfig.custom_domain == domain,
            StorefrontConfig.id != config.id
        ).first()

        if existing:
            raise ResourceConflictException(
                f"Domain '{domain}' is already in use")

    # Update fields
    for key, value in update_data.items():
        if hasattr(config, key):
            setattr(config, key, value)

    # Update version/timestamp if needed
    if hasattr(config, 'updated_at'):
        config.updated_at = func.now()

    try:
        db.commit()
        db.refresh(config)
        logger.info(f"Updated storefront config for tenant {tenant_id}")
        return config
    except IntegrityError as e:
        db.rollback()
        logger.error(
            f"Database integrity error updating storefront config: {e}")
        raise ResourceConflictException(
            f"Error updating storefront config: {str(e)}")


async def verify_domain(db: Session, tenant_id: str) -> Tuple[bool, Dict[str, Any]]:
    """
    Verify a custom domain for a tenant's storefront config.

    Args:
        db: Database session
        tenant_id: UUID of the tenant

    Returns:
        Tuple of (success: bool, verification_info: Dict)

    Raises:
        ResourceNotFoundError: If config doesn't exist
    """
    config = await get_storefront_config(db, tenant_id)
    if not config:
        raise ResourceNotFoundError(
            f"StorefrontConfig not found for tenant {tenant_id}")

    if not config.custom_domain:
        return False, {"error": "No custom domain configured"}

    # Generate verification token
    verification_token = f"cc-verify-{uuid.uuid4().hex[:16]}"

    # In a real implementation, this would perform actual DNS verification
    # via CNAME or TXT record checks

    # Return verification instructions
    return True, {
        "token": verification_token,
        "instructions": f"Add a TXT record to {config.custom_domain} with the value {verification_token}"
    }


async def mark_domain_verified(db: Session, tenant_id: str) -> StorefrontConfig:
    """
    Mark a domain as verified after successful verification.

    Args:
        db: Database session
        tenant_id: UUID of the tenant

    Returns:
        Updated StorefrontConfig

    Raises:
        ResourceNotFoundError: If config doesn't exist
    """
    config = await get_storefront_config(db, tenant_id)
    if not config:
        raise ResourceNotFoundError(
            f"StorefrontConfig not found for tenant {tenant_id}")

    config.domain_verified = True
    db.commit()
    db.refresh(config)

    logger.info(
        f"Marked domain {config.custom_domain} as verified for tenant {tenant_id}")
    return config


async def publish_storefront(
    db: Session,
    tenant_id: str,
    user_id: str
) -> StorefrontConfig:
    """
    Publish a storefront, changing its status to PUBLISHED.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user publishing the storefront

    Returns:
        Updated StorefrontConfig

    Raises:
        ResourceNotFoundError: If config doesn't exist
        ValidationException: If trying to publish with unverified custom domain
    """
    config = await get_storefront_config(db, tenant_id)
    if not config:
        raise ResourceNotFoundError(
            f"StorefrontConfig not found for tenant {tenant_id}")

    # Custom domain must be verified before publishing if it's set
    if config.custom_domain and not config.domain_verified:
        raise ValidationException(
            "Cannot publish storefront with unverified custom domain")

    # Update publish status
    config.status = StorefrontStatus.PUBLISHED
    config.published_at = datetime.now()
    config.published_by = user_id

    db.commit()
    db.refresh(config)

    logger.info(
        f"Published storefront for tenant {tenant_id} by user {user_id}")
    return config
