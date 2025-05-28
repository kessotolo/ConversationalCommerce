from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from typing import List, Optional, Dict, Any, Tuple
import uuid
from fastapi import HTTPException, status
from datetime import datetime, timedelta

from app.models.product import Product as ProductModel
from app.models.storefront import StorefrontConfig
from app.models.tenant import Tenant


async def get_storefront_metadata(db: Session, tenant_id: uuid.UUID) -> Dict[str, Any]:
    """
    Get storefront metadata for SEO and Open Graph tags.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        
    Returns:
        Dictionary containing metadata
    """
    config = db.query(StorefrontConfig).filter(
        StorefrontConfig.tenant_id == tenant_id
    ).first()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storefront configuration not found"
        )
    
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    
    if not tenant or not tenant.storefront_enabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found or storefront disabled"
        )
    
    return {
        "title": config.meta_title or f"{tenant.name} | Online Store",
        "description": config.meta_description or f"Welcome to {tenant.name}'s online store. Shop our products and enjoy great service.",
        "theme": config.theme_settings,
        "subdomain": config.subdomain_name,
        "custom_domain": config.custom_domain if config.domain_verified else None,
        "social_links": config.social_links,
        "tenant_name": tenant.name
    }


async def get_storefront_layout(db: Session, tenant_id: uuid.UUID) -> Dict[str, Any]:
    """
    Get storefront layout configuration.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        
    Returns:
        Dictionary containing layout configuration
    """
    config = db.query(StorefrontConfig).filter(
        StorefrontConfig.tenant_id == tenant_id
    ).first()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storefront configuration not found"
        )
    
    return config.layout_config


async def get_featured_products(
    db: Session, 
    tenant_id: uuid.UUID,
    limit: int = 8,
    skip: int = 0
) -> List[ProductModel]:
    """
    Get featured products for storefront display.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        limit: Maximum number of products to return
        skip: Number of products to skip (for pagination)
        
    Returns:
        List of featured products
    """
    query = db.query(ProductModel).filter(
        ProductModel.tenant_id == tenant_id,
        ProductModel.is_deleted == False,
        ProductModel.show_on_storefront == True,
        ProductModel.is_featured == True
    )
    
    # Order by newest first
    query = query.order_by(desc(ProductModel.created_at))
    
    # Apply pagination
    products = query.offset(skip).limit(limit).all()
    
    return products


async def get_product_categories(
    db: Session, 
    tenant_id: uuid.UUID
) -> List[Dict[str, Any]]:
    """
    Get product categories for the storefront.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        
    Returns:
        List of categories with counts
    """
    # Get distinct categories and count products in each
    categories = db.query(
        ProductModel.category,
        func.count(ProductModel.id).label('product_count')
    ).filter(
        ProductModel.tenant_id == tenant_id,
        ProductModel.is_deleted == False,
        ProductModel.show_on_storefront == True,
        ProductModel.category.isnot(None)
    ).group_by(
        ProductModel.category
    ).order_by(
        desc('product_count')
    ).all()
    
    result = [
        {
            "name": category[0],
            "product_count": category[1],
            "slug": category[0].lower().replace(' ', '-').replace('&', 'and')
        } 
        for category in categories
    ]
    
    return result


async def get_products_by_category(
    db: Session,
    tenant_id: uuid.UUID,
    category: str,
    limit: int = 20,
    skip: int = 0
) -> Tuple[List[ProductModel], int]:
    """
    Get products by category for the storefront.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        category: Category name
        limit: Maximum number of products to return
        skip: Number of products to skip (for pagination)
        
    Returns:
        Tuple of (list of products, total count)
    """
    base_query = db.query(ProductModel).filter(
        ProductModel.tenant_id == tenant_id,
        ProductModel.is_deleted == False,
        ProductModel.show_on_storefront == True,
        ProductModel.category == category
    )
    
    # Get total count
    total = base_query.count()
    
    # Apply pagination and ordering
    products = base_query.order_by(
        desc(ProductModel.is_featured),
        desc(ProductModel.created_at)
    ).offset(skip).limit(limit).all()
    
    return products, total


async def get_product_detail(
    db: Session,
    tenant_id: uuid.UUID,
    product_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Get detailed product information for the storefront.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        product_id: UUID of the product
        
    Returns:
        Dictionary containing product details and related products
    """
    product = db.query(ProductModel).filter(
        ProductModel.id == product_id,
        ProductModel.tenant_id == tenant_id,
        ProductModel.is_deleted == False,
        ProductModel.show_on_storefront == True
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Get related products (same category, excluding this product)
    related_products_query = db.query(ProductModel).filter(
        ProductModel.tenant_id == tenant_id,
        ProductModel.is_deleted == False,
        ProductModel.show_on_storefront == True,
        ProductModel.id != product_id
    )
    
    if product.category:
        related_products_query = related_products_query.filter(
            ProductModel.category == product.category
        )
    
    related_products = related_products_query.order_by(
        func.random()
    ).limit(4).all()
    
    return {
        "product": product,
        "related_products": related_products
    }


async def search_products(
    db: Session,
    tenant_id: uuid.UUID,
    query: str,
    limit: int = 20,
    skip: int = 0
) -> Tuple[List[ProductModel], int]:
    """
    Search for products in the storefront.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        query: Search query
        limit: Maximum number of products to return
        skip: Number of products to skip (for pagination)
        
    Returns:
        Tuple of (list of products, total count)
    """
    search_term = f"%{query}%"
    
    base_query = db.query(ProductModel).filter(
        ProductModel.tenant_id == tenant_id,
        ProductModel.is_deleted == False,
        ProductModel.show_on_storefront == True,
        or_(
            ProductModel.name.ilike(search_term),
            ProductModel.description.ilike(search_term),
            ProductModel.category.ilike(search_term)
        )
    )
    
    # Get total count
    total = base_query.count()
    
    # Apply pagination and ordering
    products = base_query.order_by(
        desc(ProductModel.is_featured),
        desc(ProductModel.created_at)
    ).offset(skip).limit(limit).all()
    
    return products, total


async def get_navigation_menu(db: Session, tenant_id: uuid.UUID) -> Dict[str, Any]:
    """
    Get navigation menu for the storefront.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        
    Returns:
        Dictionary containing navigation menu structure
    """
    config = db.query(StorefrontConfig).filter(
        StorefrontConfig.tenant_id == tenant_id
    ).first()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storefront configuration not found"
        )
    
    # Get top categories
    categories = await get_product_categories(db, tenant_id)
    top_categories = categories[:5]  # Only show top 5 categories in navigation
    
    # Build navigation structure
    navigation = {
        "main_menu": [
            {"label": "Home", "url": "/", "type": "link"},
            {"label": "Products", "url": "/products", "type": "link"},
            {"label": "Categories", "type": "dropdown", "items": [
                {"label": cat["name"], "url": f"/category/{cat['slug']}", "type": "link"}
                for cat in top_categories
            ]},
            {"label": "About", "url": "/about", "type": "link"},
            {"label": "Contact", "url": "/contact", "type": "link"}
        ],
        "footer_menu": {
            "company": [
                {"label": "About Us", "url": "/about", "type": "link"},
                {"label": "Contact", "url": "/contact", "type": "link"},
                {"label": "Terms & Conditions", "url": "/terms", "type": "link"},
                {"label": "Privacy Policy", "url": "/privacy", "type": "link"}
            ],
            "shop": [
                {"label": "All Products", "url": "/products", "type": "link"},
                {"label": "Featured", "url": "/featured", "type": "link"},
                {"label": "New Arrivals", "url": "/new-arrivals", "type": "link"}
            ],
            "social": [
                {"label": "WhatsApp", "url": config.social_links.get("whatsapp", ""), "type": "social"},
                {"label": "Instagram", "url": config.social_links.get("instagram", ""), "type": "social"},
                {"label": "Facebook", "url": config.social_links.get("facebook", ""), "type": "social"},
                {"label": "Twitter", "url": config.social_links.get("twitter", ""), "type": "social"},
                {"label": "TikTok", "url": config.social_links.get("tiktok", ""), "type": "social"}
            ]
        }
    }
    
    return navigation
