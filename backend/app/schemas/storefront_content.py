from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
import uuid
from datetime import datetime


class ProductBase(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    price: float
    compare_at_price: Optional[float] = None
    sku: Optional[str] = None
    inventory_quantity: int
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    images: Optional[List[str]] = None
    is_featured: bool
    
    model_config = ConfigDict(from_attributes=True)


class ProductDetail(ProductBase):
    created_at: datetime
    updated_at: datetime
    attributes: Optional[Dict[str, Any]] = None
    variant_options: Optional[List[Dict[str, Any]]] = None


class RelatedProducts(BaseModel):
    product: ProductDetail
    related_products: List[ProductBase]
    
    model_config = ConfigDict(from_attributes=True)


class CategoryInfo(BaseModel):
    name: str
    product_count: int
    slug: str


class PaginatedProducts(BaseModel):
    items: List[ProductBase]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    model_config = ConfigDict(from_attributes=True)


class StorefrontMetadata(BaseModel):
    title: str
    description: str
    theme: Dict[str, Any]
    subdomain: str
    custom_domain: Optional[str] = None
    social_links: Dict[str, str]
    tenant_name: str


class StorefrontLayout(BaseModel):
    layout_config: Dict[str, Any]
    
    model_config = ConfigDict(from_attributes=True)


class MenuItem(BaseModel):
    label: str
    url: str
    type: str
    items: Optional[List['MenuItem']] = None


class NavigationMenu(BaseModel):
    main_menu: List[MenuItem]
    footer_menu: Dict[str, List[MenuItem]]


# Update forward reference for nested menus
MenuItem.model_rebuild()
