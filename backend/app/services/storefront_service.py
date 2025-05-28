from typing import List, Optional, Dict, Any, Tuple
import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.storefront import StorefrontConfig
from app.models.tenant import Tenant
from app.utils.storefront_defaults import create_default_storefront_config, get_theme_variations
from app.utils.domain_validator import (
    validate_subdomain, 
    validate_domain, 
    verify_domain_dns,
    generate_verification_token
)


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
    Create a new StorefrontConfig for a tenant.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        subdomain: Optional custom subdomain
        custom_domain: Optional custom domain
        meta_title: Optional meta title for SEO
        meta_description: Optional meta description for SEO
        theme_settings: Optional theme settings
        layout_config: Optional layout configuration
        social_links: Optional social media links
        
    Returns:
        Newly created StorefrontConfig
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
    Generate verification instructions for a custom domain.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        
    Returns:
        Tuple of (verification_token, verification_instructions)
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
    Check if a domain's DNS verification is complete.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        
    Returns:
        True if verified, False otherwise
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
