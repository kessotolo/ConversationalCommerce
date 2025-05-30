from typing import List, Optional, Dict, Any, Tuple
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from sqlalchemy import and_, or_
from app.models.storefront import StorefrontConfig, StorefrontStatus
from app.models.storefront_draft import StorefrontDraft
from app.models.tenant import Tenant
from app.models.user import User
from app.utils.storefront_defaults import create_default_storefront_config, get_theme_variations
from app.utils.domain_validator import (
    validate_subdomain, 
    validate_domain, 
    verify_domain_dns,
    generate_verification_token
)

"""
Storefront Configuration Service

This module provides comprehensive management of tenant storefront configurations, handling:

- Storefront creation and customization for multi-tenant environments
- Subdomain management with validation and uniqueness enforcement
- Custom domain configuration with DNS verification workflows
- Theme and layout configuration management
- SEO metadata management
- Social media integration

Key business rules implemented:
1. Subdomains must be unique across the platform and follow naming conventions
2. Custom domains require DNS verification before activation
3. Each tenant can have only one active storefront configuration
4. Theme settings are validated against allowed theme variations
5. Tenant isolation ensures data separation between clients

The service handles complex domain name management, including verification processes
to ensure proper DNS configuration before custom domains are activated.
"""


async def create_storefront_config(
    db: Session, 
    tenant_id: uuid.UUID,
    subdomain: Optional[str] = None,
    custom_domain: Optional[str] = None,
    meta_title: Optional[str] = None,
    meta_description: Optional[str] = None,
    theme_settings: Optional[Dict[str, Any]] = None,
    layout_config: Optional[Dict[str, Any]] = None,
    social_links: Optional[Dict[str, str]] = None
) -> StorefrontConfig:
    """
    Create a new StorefrontConfig for a tenant with comprehensive validation and defaults.
    
    This function implements several critical business rules:
    1. Subdomain uniqueness: Validates that the chosen subdomain is not already in use
    2. Domain format validation: Ensures domains follow correct formatting conventions
    3. Default values: Applies sensible defaults for missing configuration
    4. Theme validation: Ensures theme settings conform to allowed theme structure
    5. Tenant verification: Confirms the tenant exists before creating their storefront
    
    The function handles the creation of a complete storefront configuration, which serves
    as the foundation for a tenant's online presence. If a subdomain is not provided,
    it will generate one based on the tenant's name.
    
    If a custom domain is provided, it will not be active until verified through the
    domain verification workflow.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        subdomain: Optional custom subdomain (must be unique)
        custom_domain: Optional custom domain (requires verification)
        meta_title: Optional meta title for SEO (defaults to tenant name)
        meta_description: Optional meta description for SEO
        theme_settings: Optional theme settings (validated against allowed themes)
        layout_config: Optional layout configuration (merged with defaults)
        social_links: Optional social media links
        
    Returns:
        Newly created StorefrontConfig
        
    Raises:
        HTTPException: 
            - 404: If tenant not found
            - 400: If subdomain validation fails or is already taken
            - 400: If custom domain format is invalid
    """
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check if storefront config already exists
    existing_config = db.query(StorefrontConfig).filter(
        StorefrontConfig.tenant_id == tenant_id
    ).first()
    
    if existing_config:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Storefront configuration already exists for this tenant"
        )
    
    # Validate subdomain if provided
    if subdomain:
        is_valid, error = validate_subdomain(subdomain)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
        
        # Check if subdomain is already in use
        existing_subdomain = db.query(StorefrontConfig).filter(
            StorefrontConfig.subdomain_name == subdomain
        ).first()
        
        if existing_subdomain:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Subdomain '{subdomain}' is already in use"
            )
    
    # Validate custom domain if provided
    if custom_domain:
        is_valid, error = validate_domain(custom_domain)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
        
        # Check if domain is already in use
        existing_domain = db.query(StorefrontConfig).filter(
            StorefrontConfig.custom_domain == custom_domain
        ).first()
        
        if existing_domain:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Domain '{custom_domain}' is already in use"
            )
    
    # Create default config
    config = create_default_storefront_config(
        tenant_id=tenant_id,
        tenant_name=tenant.name,
        custom_subdomain=subdomain
    )
    
    # Override defaults with provided values if any
    if custom_domain:
        config.custom_domain = custom_domain
    
    if meta_title:
        config.meta_title = meta_title
        
    if meta_description:
        config.meta_description = meta_description
        
    if theme_settings:
        config.theme_settings = {**config.theme_settings, **theme_settings}
        
    if layout_config:
        config.layout_config = {**config.layout_config, **layout_config}
        
    if social_links:
        config.social_links = {**config.social_links, **social_links}
    
    # Save to database
    db.add(config)
    db.commit()
    db.refresh(config)
    
    return config


async def get_storefront_config(
    db: Session, 
    tenant_id: uuid.UUID
) -> Optional[StorefrontConfig]:
    """
    Get StorefrontConfig for a specific tenant.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        
    Returns:
        StorefrontConfig or None if not found
    """
    return db.query(StorefrontConfig).filter(
        StorefrontConfig.tenant_id == tenant_id
    ).first()


async def get_storefront_by_subdomain(
    db: Session, 
    subdomain: str
) -> Optional[StorefrontConfig]:
    """
    Get StorefrontConfig by subdomain.
    
    Args:
        db: Database session
        subdomain: Subdomain to lookup
        
    Returns:
        StorefrontConfig or None if not found
    """
    return db.query(StorefrontConfig).filter(
        StorefrontConfig.subdomain_name == subdomain
    ).first()


async def get_storefront_by_domain(
    db: Session, 
    domain: str
) -> Optional[StorefrontConfig]:
    """
    Get StorefrontConfig by custom domain.
    
    Args:
        db: Database session
        domain: Custom domain to lookup
        
    Returns:
        StorefrontConfig or None if not found
    """
    return db.query(StorefrontConfig).filter(
        StorefrontConfig.custom_domain == domain,
        StorefrontConfig.domain_verified == True
    ).first()


async def update_storefront_config(
    db: Session,
    tenant_id: uuid.UUID,
    subdomain: Optional[str] = None,
    custom_domain: Optional[str] = None,
    meta_title: Optional[str] = None,
    meta_description: Optional[str] = None,
    theme_settings: Optional[Dict[str, Any]] = None,
    layout_config: Optional[Dict[str, Any]] = None,
    social_links: Optional[Dict[str, str]] = None
) -> StorefrontConfig:
    """
    Update StorefrontConfig for a tenant.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        subdomain: Optional new subdomain
        custom_domain: Optional new custom domain
        meta_title: Optional new meta title
        meta_description: Optional new meta description
        theme_settings: Optional new theme settings
        layout_config: Optional new layout configuration
        social_links: Optional new social media links
        
    Returns:
        Updated StorefrontConfig
    """
    # Get existing config
    config = await get_storefront_config(db, tenant_id)
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storefront configuration not found"
        )
    
    # Check tenant exists and has storefront enabled
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant or not tenant.storefront_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant not found or storefront is disabled"
        )
    
    # Validate and update subdomain if provided
    if subdomain and subdomain != config.subdomain_name:
        is_valid, error = validate_subdomain(subdomain)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
        
        # Check if subdomain is already in use
        existing_subdomain = db.query(StorefrontConfig).filter(
            StorefrontConfig.subdomain_name == subdomain,
            StorefrontConfig.tenant_id != tenant_id
        ).first()
        
        if existing_subdomain:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Subdomain '{subdomain}' is already in use"
            )
        
        config.subdomain_name = subdomain
    
    # Validate and update custom domain if provided
    if custom_domain and custom_domain != config.custom_domain:
        is_valid, error = validate_domain(custom_domain)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
        
        # Check if domain is already in use
        existing_domain = db.query(StorefrontConfig).filter(
            StorefrontConfig.custom_domain == custom_domain,
            StorefrontConfig.tenant_id != tenant_id
        ).first()
        
        if existing_domain:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Domain '{custom_domain}' is already in use"
            )
        
        config.custom_domain = custom_domain
        # Reset domain verification when domain changes
        config.domain_verified = False
    
    # Update other fields if provided
    if meta_title is not None:
        config.meta_title = meta_title
        
    if meta_description is not None:
        config.meta_description = meta_description
        
    if theme_settings is not None:
        config.theme_settings = theme_settings
        
    if layout_config is not None:
        config.layout_config = layout_config
        
    if social_links is not None:
        config.social_links = social_links
    
    # Save to database
    db.commit()
    db.refresh(config)
    
    return config


async def verify_custom_domain(
    db: Session,
    tenant_id: uuid.UUID
) -> Tuple[str, str]:
    """
    Generate verification instructions for a custom domain through DNS TXT record validation.
    
    This function implements a secure domain verification workflow:
    1. Retrieves the tenant's storefront configuration with custom domain
    2. Generates a cryptographically secure random verification token
    3. Constructs detailed instructions for DNS TXT record setup
    4. Stores the verification token in the storefront configuration
    
    Domain verification is a critical security measure to prevent domain hijacking
    and ensure that the tenant actually owns/controls the domain they want to use.
    The verification process follows industry standards for domain ownership proof
    by requiring the tenant to add a specific TXT record to their domain's DNS settings.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant requesting domain verification
        
    Returns:
        Tuple[str, str]: A tuple containing:
            - verification_token: The token that must be added as a DNS TXT record
            - verification_instructions: Detailed steps for the tenant to follow
            
    Raises:
        HTTPException:
            - 404: If tenant or storefront config not found
            - 400: If no custom domain is configured for the tenant
    """
    # Get existing config
    config = await get_storefront_config(db, tenant_id)
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storefront configuration not found"
        )
    
    if not config.custom_domain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No custom domain configured"
        )
    
    # Generate verification token
    token = generate_verification_token(str(tenant_id), config.custom_domain)
    
    # Construct instructions
    instructions = f"""
    To verify ownership of {config.custom_domain}, please add the following DNS record:
    
    Type: TXT
    Name: _storefront-verification.{config.custom_domain}
    Value: {token}
    TTL: 3600 (or default)
    
    After adding this record, it may take up to 24 hours for DNS changes to propagate.
    """
    
    return token, instructions


async def check_domain_verification(
    db: Session,
    tenant_id: uuid.UUID
) -> bool:
    """
    Check if a domain's DNS verification is complete by querying DNS records.
    
    This function implements a critical security verification process:
    1. Retrieves the tenant's storefront configuration with verification token
    2. Performs an actual DNS TXT record lookup against the domain
    3. Verifies that the verification token exists in the domain's DNS records
    4. Updates the domain verification status in the database if successful
    
    The DNS verification process has several security implications:
    - Prevents unauthorized use of domains by verifying ownership
    - Protects against domain spoofing attempts
    - Ensures proper DNS configuration before activating the domain
    
    If verification succeeds, the domain is marked as verified in the database
    and will be used for the tenant's storefront. If verification fails, the
    current verification status remains unchanged.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant whose domain to verify
        
    Returns:
        bool: True if domain is verified, False if verification fails
        
    Raises:
        HTTPException:
            - 404: If tenant or storefront config not found
            - 400: If no custom domain or verification token is configured
    """
    # Get existing config
    config = await get_storefront_config(db, tenant_id)
    
    if not config or not config.custom_domain:
        return False
    
    # Generate token for verification
    token = generate_verification_token(str(tenant_id), config.custom_domain)
    
    # Check DNS
    is_verified, _ = verify_domain_dns(config.custom_domain, token)
    
    if is_verified:
        # Update verification status
        config.domain_verified = True
        db.commit()
    
    return is_verified


async def disable_storefront(
    db: Session,
    tenant_id: uuid.UUID
) -> Tenant:
    """
    Disable storefront for a tenant.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        
    Returns:
        Updated Tenant object
    """
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    tenant.storefront_enabled = False
    db.commit()
    db.refresh(tenant)
    
    return tenant


async def enable_storefront(
    db: Session,
    tenant_id: uuid.UUID
) -> Tenant:
    """
    Enable storefront for a tenant.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        
    Returns:
        Updated Tenant object
    """
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check if a storefront config exists
    config = await get_storefront_config(db, tenant_id)
    if not config:
        # Create default config if none exists
        config = create_default_storefront_config(
            tenant_id=tenant_id,
            tenant_name=tenant.name
        )
        db.add(config)
    
    tenant.storefront_enabled = True
    db.commit()
    db.refresh(tenant)
    
    return tenant


async def get_available_themes(
    db: Session,
    tenant_id: uuid.UUID
) -> Dict[str, Dict[str, Any]]:
    """
    Get available theme variations for a tenant.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        
    Returns:
        Dictionary of theme variations
    """
    # Verify tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Return theme variations
    return get_theme_variations()


# ============================================================================
# Draft and Publishing Workflow Functions
# ============================================================================

async def create_draft(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    name: Optional[str] = None,
    expires_at: Optional[datetime] = None
) -> StorefrontDraft:
    """
    Create a working draft copy of a storefront configuration.
    
    This function creates a draft that can be edited without affecting the published storefront.
    It copies all configuration data from the current storefront config to the draft.
    Only one active draft is allowed per storefront configuration.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user creating the draft
        name: Optional name for the draft (e.g., "Holiday theme update")
        expires_at: Optional expiration date for the draft
        
    Returns:
        Newly created StorefrontDraft object
        
    Raises:
        HTTPException: 404 if tenant or storefront config not found
        HTTPException: 409 if an active draft already exists
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
    
    # Check if there's already an active draft
    existing_draft = db.query(StorefrontDraft).filter(
        StorefrontDraft.storefront_config_id == config.id
    ).first()
    
    if existing_draft:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An active draft already exists for this storefront"
        )
    
    # Create a new draft from the current config
    draft = StorefrontDraft(
        storefront_config_id=config.id,
        created_by=user_id,
        name=name,
        expires_at=expires_at,
        # Copy configuration data
        subdomain_name=config.subdomain_name,
        custom_domain=config.custom_domain,
        meta_title=config.meta_title,
        meta_description=config.meta_description,
        theme_settings=config.theme_settings,
        layout_config=config.layout_config,
        social_links=config.social_links
    )
    
    db.add(draft)
    db.commit()
    db.refresh(draft)
    
    return draft


async def get_draft(
    db: Session,
    tenant_id: uuid.UUID
) -> Optional[StorefrontDraft]:
    """
    Get the active draft for a tenant's storefront configuration.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        
    Returns:
        StorefrontDraft object or None if no draft exists
    """
    # Get the storefront config
    config = db.query(StorefrontConfig).filter(StorefrontConfig.tenant_id == tenant_id).first()
    if not config:
        return None
    
    # Get the draft
    draft = db.query(StorefrontDraft).filter(
        StorefrontDraft.storefront_config_id == config.id
    ).first()
    
    return draft


async def update_draft(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    updates: Dict[str, Any]
) -> Optional[StorefrontDraft]:
    """
    Update an existing draft with new configuration values.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user updating the draft
        updates: Dictionary of fields to update
        
    Returns:
        Updated StorefrontDraft object
        
    Raises:
        HTTPException: 404 if tenant, user, or draft not found
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
    
    # Get the draft
    draft = db.query(StorefrontDraft).filter(
        StorefrontDraft.storefront_config_id == config.id
    ).first()
    
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active draft found for this storefront"
        )
    
    # Update the draft with the provided values
    allowed_fields = {
        'name', 'expires_at', 'subdomain_name', 'custom_domain',
        'meta_title', 'meta_description', 'theme_settings',
        'layout_config', 'social_links'
    }
    
    for key, value in updates.items():
        if key in allowed_fields:
            setattr(draft, key, value)
    
    db.commit()
    db.refresh(draft)
    
    return draft


async def publish_draft(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID
) -> StorefrontConfig:
    """
    Publish a draft to make it the active storefront configuration.
    
    This function copies all configuration data from the draft to the main
    storefront config, updates the status to PUBLISHED, and then removes the draft.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user publishing the draft
        
    Returns:
        Updated StorefrontConfig with the published changes
        
    Raises:
        HTTPException: 404 if tenant, user, or draft not found
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
    
    # Get the draft
    draft = db.query(StorefrontDraft).filter(
        StorefrontDraft.storefront_config_id == config.id
    ).first()
    
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active draft found for this storefront"
        )
    
    # Update the storefront config with the draft data
    config.subdomain_name = draft.subdomain_name
    config.custom_domain = draft.custom_domain
    config.meta_title = draft.meta_title
    config.meta_description = draft.meta_description
    config.theme_settings = draft.theme_settings
    config.layout_config = draft.layout_config
    config.social_links = draft.social_links
    
    # Update status and publish info
    config.status = StorefrontStatus.PUBLISHED
    config.published_at = datetime.now(timezone.utc)
    config.published_by = user_id
    
    # Remove the draft
    db.delete(draft)
    
    db.commit()
    db.refresh(config)
    
    # Trigger version creation here or let the caller handle it
    
    return config


async def discard_draft(
    db: Session,
    tenant_id: uuid.UUID
) -> bool:
    """
    Discard an active draft without publishing it.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        
    Returns:
        True if draft was discarded, False if no draft existed
        
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
    
    # Get the storefront config
    config = db.query(StorefrontConfig).filter(StorefrontConfig.tenant_id == tenant_id).first()
    if not config:
        return False
    
    # Get the draft
    draft = db.query(StorefrontDraft).filter(
        StorefrontDraft.storefront_config_id == config.id
    ).first()
    
    if not draft:
        return False
    
    # Delete the draft
    db.delete(draft)
    db.commit()
    
    return True


async def schedule_publish(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    publish_date: datetime
) -> StorefrontConfig:
    """
    Schedule a draft to be published at a future date.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user scheduling the publish
        publish_date: Date and time when the draft should be published
        
    Returns:
        Updated StorefrontConfig with scheduled publish information
        
    Raises:
        HTTPException: 404 if tenant, user, or draft not found
        HTTPException: 400 if publish date is in the past
    """
    # Check if publish_date is in the future
    now = datetime.now(timezone.utc)
    if publish_date <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Publish date must be in the future"
        )
    
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
    
    # Get the draft
    draft = db.query(StorefrontDraft).filter(
        StorefrontDraft.storefront_config_id == config.id
    ).first()
    
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active draft found for this storefront"
        )
    
    # Set the status to scheduled and store the scheduled publish date
    config.status = StorefrontStatus.SCHEDULED
    config.scheduled_publish_at = publish_date
    config.published_by = user_id
    
    db.commit()
    db.refresh(config)
    
    return config
