from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, and_, or_, text
from typing import List, Optional, Dict, Any, Tuple
import uuid
from fastapi import HTTPException, status
from datetime import datetime

from app.models.product import Product as ProductModel
from app.schemas.product import ProductSearchParams


async def get_storefront_products(
    db: Session,
    tenant_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    category: Optional[str] = None,
    collection: Optional[str] = None,
    tags: Optional[List[str]] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    search_query: Optional[str] = None,
    featured_only: bool = False
) -> Tuple[List[ProductModel], int]:
    """
    Get products for storefront display with various filters.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        page: Page number (1-indexed)
        page_size: Number of items per page
        sort_by: Field to sort by
        sort_order: Sort order (asc or desc)
        category: Filter by category
        collection: Filter by collection
        tags: Filter by tags
        price_min: Minimum price
        price_max: Maximum price
        search_query: Search query
        featured_only: Only return featured products
        
    Returns:
        Tuple of (list of products, total count)
    """
    # Base query for visible products
    query = db.query(ProductModel).filter(
        ProductModel.tenant_id == tenant_id,
        ProductModel.is_deleted == False,
        ProductModel.show_on_storefront == True,
        ProductModel.inventory_quantity > 0  # Only show in-stock products
    )
    
    # Apply filters
    if category:
        query = query.filter(ProductModel.category == category)
    
    if collection:
        query = query.filter(ProductModel.collection == collection)
    
    if tags and len(tags) > 0:
        # Use any() to match products with any of the specified tags
        query = query.filter(ProductModel.tags.op('?|')(tags))
    
    if price_min is not None:
        query = query.filter(ProductModel.price >= price_min)
    
    if price_max is not None:
        query = query.filter(ProductModel.price <= price_max)
    
    if search_query:
        search_term = f"%{search_query}%"
        query = query.filter(or_(
            ProductModel.name.ilike(search_term),
            ProductModel.description.ilike(search_term),
            ProductModel.category.ilike(search_term),
            ProductModel.collection.ilike(search_term)
        ))
    
    if featured_only:
        query = query.filter(ProductModel.is_featured == True)
    
    # Get total count before pagination
    total_count = query.count()
    
    # Apply sorting
    if sort_order.lower() == "asc":
        query = query.order_by(asc(getattr(ProductModel, sort_by)))
    else:
        query = query.order_by(desc(getattr(ProductModel, sort_by)))
    
    # Add secondary sort for consistent pagination
    if sort_by != "id":
        query = query.order_by(desc(ProductModel.id))
    
    # Apply pagination
    skip = (page - 1) * page_size
    query = query.offset(skip).limit(page_size)
    
    # Execute query
    products = query.all()
    
    return products, total_count


async def get_product_collections(
    db: Session,
    tenant_id: uuid.UUID
) -> List[Dict[str, Any]]:
    """
    Get product collections for the storefront.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        
    Returns:
        List of collections with counts
    """
    # Get distinct collections and count products in each
    collections = db.query(
        ProductModel.collection,
        func.count(ProductModel.id).label('product_count')
    ).filter(
        ProductModel.tenant_id == tenant_id,
        ProductModel.is_deleted == False,
        ProductModel.show_on_storefront == True,
        ProductModel.collection.isnot(None)
    ).group_by(
        ProductModel.collection
    ).order_by(
        desc('product_count')
    ).all()
    
    result = [
        {
            "name": collection[0],
            "product_count": collection[1],
            "slug": collection[0].lower().replace(' ', '-').replace('&', 'and')
        } 
        for collection in collections
    ]
    
    return result


async def get_product_tags(
    db: Session,
    tenant_id: uuid.UUID,
    limit: int = 20
) -> List[Dict[str, Any]]:
    """
    Get product tags for the storefront.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        limit: Maximum number of tags to return
        
    Returns:
        List of tags with counts
    """
    # This is a more complex query since tags are stored as an array
    # We need to unnest the array and count occurrences
    query = text("""
    SELECT tag, COUNT(distinct p.id) as product_count
    FROM product p, unnest(p.tags) AS tag
    WHERE p.tenant_id = :tenant_id
      AND p.is_deleted = false
      AND p.show_on_storefront = true
    GROUP BY tag
    ORDER BY product_count DESC
    LIMIT :limit
    """)
    
    result = db.execute(
        query, 
        {"tenant_id": str(tenant_id), "limit": limit}
    ).fetchall()
    
    return [
        {
            "name": tag[0],
            "product_count": tag[1],
            "slug": tag[0].lower().replace(' ', '-').replace('&', 'and')
        } 
        for tag in result
    ]


async def get_product_detail_for_storefront(
    db: Session,
    tenant_id: uuid.UUID,
    product_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Get detailed product information for the storefront with variants and related products.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        product_id: UUID of the product
        
    Returns:
        Dictionary containing product details, variants, and related products
    """
    # Get the main product
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
    related_products = db.query(ProductModel).filter(
        ProductModel.tenant_id == tenant_id,
        ProductModel.is_deleted == False,
        ProductModel.show_on_storefront == True,
        ProductModel.id != product_id,
        ProductModel.category == product.category
    ).order_by(
        desc(ProductModel.is_featured),
        func.random()
    ).limit(4).all()
    
    # Get recommended products (based on tags)
    recommended_query = db.query(ProductModel).filter(
        ProductModel.tenant_id == tenant_id,
        ProductModel.is_deleted == False,
        ProductModel.show_on_storefront == True,
        ProductModel.id != product_id
    )
    
    # If the product has tags, recommend products with matching tags
    if product.tags and len(product.tags) > 0:
        recommended_query = recommended_query.filter(
            ProductModel.tags.overlap(product.tags)
        )
    else:
        # Otherwise, just recommend other products from different categories
        recommended_query = recommended_query.filter(
            ProductModel.category != product.category if product.category else True
        )
    
    recommended_products = recommended_query.order_by(
        desc(ProductModel.is_featured),
        func.random()
    ).limit(4).all()
    
    # Get product variants if they exist
    variants = []
    if product.variant_options and len(product.variant_options) > 0:
        # If the product has variant options defined, find products with same base_product_id
        if product.base_product_id:
            base_id = product.base_product_id
        else:
            base_id = product.id
            
        variants = db.query(ProductModel).filter(
            ProductModel.tenant_id == tenant_id,
            ProductModel.is_deleted == False,
            ProductModel.show_on_storefront == True,
            or_(
                ProductModel.base_product_id == base_id,
                and_(
                    ProductModel.id == base_id,
                    ProductModel.id != product_id
                )
            )
        ).all()
    
    # Organize variant options for display
    variant_options = {}
    if product.variant_options:
        for option in product.variant_options:
            if "name" in option and "values" in option:
                variant_options[option["name"]] = option["values"]
    
    # Build response
    result = {
        "product": product,
        "related_products": related_products,
        "recommended_products": recommended_products,
        "variants": variants,
        "variant_options": variant_options
    }
    
    return result


async def transform_product_images(product: Dict[str, Any], sizes: List[str] = None) -> Dict[str, Any]:
    """
    Transform product images for responsive display.
    
    Args:
        product: Product data dictionary
        sizes: List of sizes to generate (thumbnail, small, medium, large)
        
    Returns:
        Product with transformed image URLs
    """
    if not sizes:
        sizes = ["thumbnail", "small", "medium", "large"]
    
    size_dimensions = {
        "thumbnail": "100x100",
        "small": "300x300",
        "medium": "600x600",
        "large": "1200x1200"
    }
    
    # Create copy to avoid modifying the original
    result = dict(product)
    
    # Transform images if present
    if "images" in result and result["images"]:
        transformed_images = []
        
        for image_url in result["images"]:
            image_variations = {
                "original": image_url
            }
            
            # Generate URLs for each size
            for size in sizes:
                if size in size_dimensions:
                    # If using Cloudinary or similar service, generate transformation URL
                    if "cloudinary.com" in image_url:
                        # Extract the upload path from the URL
                        parts = image_url.split('/upload/')
                        if len(parts) == 2:
                            base = parts[0] + '/upload/'
                            path = parts[1]
                            
                            # Add transformation parameters
                            dim = size_dimensions[size]
                            transform = f"c_fit,w_{dim.split('x')[0]},h_{dim.split('x')[1]}/"
                            
                            image_variations[size] = f"{base}{transform}{path}"
                    else:
                        # For other image services, could add query parameters
                        image_variations[size] = f"{image_url}?size={size_dimensions[size]}"
            
            transformed_images.append(image_variations)
        
        result["transformed_images"] = transformed_images
    
    return result


async def get_new_arrivals(
    db: Session,
    tenant_id: uuid.UUID,
    limit: int = 8
) -> List[ProductModel]:
    """
    Get new product arrivals for the storefront.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        limit: Maximum number of products to return
        
    Returns:
        List of new products
    """
    products = db.query(ProductModel).filter(
        ProductModel.tenant_id == tenant_id,
        ProductModel.is_deleted == False,
        ProductModel.show_on_storefront == True,
        ProductModel.inventory_quantity > 0
    ).order_by(
        desc(ProductModel.created_at)
    ).limit(limit).all()
    
    return products


async def get_bestsellers(
    db: Session,
    tenant_id: uuid.UUID,
    limit: int = 8
) -> List[ProductModel]:
    """
    Get bestselling products for the storefront.
    
    Args:
        db: Database session
        tenant_id: UUID of the tenant
        limit: Maximum number of products to return
        
    Returns:
        List of bestselling products
    """
    # In a real system, this would use sales data
    # For this example, we'll use featured products as a proxy
    products = db.query(ProductModel).filter(
        ProductModel.tenant_id == tenant_id,
        ProductModel.is_deleted == False,
        ProductModel.show_on_storefront == True,
        ProductModel.is_featured == True,
        ProductModel.inventory_quantity > 0
    ).order_by(
        desc(ProductModel.popularity_score) if hasattr(ProductModel, 'popularity_score') else desc(ProductModel.created_at)
    ).limit(limit).all()
    
    return products
