from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
import uuid
from datetime import datetime


class ImageVariation(BaseModel):
    """Image variation with different sizes for responsive display."""
    original: str
    thumbnail: Optional[str] = None
    small: Optional[str] = None
    medium: Optional[str] = None
    large: Optional[str] = None


class ProductVariantOption(BaseModel):
    """Product variant option (color, size, etc.)"""
    name: str
    values: List[str]


class StorefrontProductBase(BaseModel):
    """Base product information for storefront display."""
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    price: float
    compare_at_price: Optional[float] = None
    sku: Optional[str] = None
    inventory_quantity: int
    category: Optional[str] = None
    collection: Optional[str] = None
    tags: Optional[List[str]] = None
    images: Optional[List[str]] = None
    transformed_images: Optional[List[ImageVariation]] = None
    is_featured: bool
    
    model_config = ConfigDict(from_attributes=True)


class StorefrontProductDetail(StorefrontProductBase):
    """Detailed product information for product page display."""
    created_at: datetime
    updated_at: datetime
    attributes: Optional[Dict[str, Any]] = None
    variant_options: Optional[List[ProductVariantOption]] = None
    base_product_id: Optional[uuid.UUID] = None
    
    model_config = ConfigDict(from_attributes=True)


class VariantGroup(BaseModel):
    """Group of product variants with their options."""
    option_name: str
    options: List[str]
    variants: Dict[str, StorefrontProductBase]


class StorefrontProductWithVariants(BaseModel):
    """Product with its variants for storefront display."""
    product: StorefrontProductDetail
    variants: List[StorefrontProductBase]
    variant_options: Dict[str, List[str]]
    related_products: List[StorefrontProductBase]
    recommended_products: List[StorefrontProductBase]
    
    model_config = ConfigDict(from_attributes=True)


class PaginatedStorefrontProducts(BaseModel):
    """Paginated list of products for storefront display."""
    items: List[StorefrontProductBase]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    model_config = ConfigDict(from_attributes=True)


class CollectionInfo(BaseModel):
    """Information about a product collection."""
    name: str
    product_count: int
    slug: str


class TagInfo(BaseModel):
    """Information about a product tag."""
    name: str
    product_count: int
    slug: str


class ProductFilterParams(BaseModel):
    """Parameters for filtering products in the storefront."""
    category: Optional[str] = None
    collection: Optional[str] = None
    tags: Optional[List[str]] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    search_query: Optional[str] = None
    sort_by: str = "created_at"
    sort_order: str = "desc"
    featured_only: bool = False
