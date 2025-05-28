from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
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
    
    class Config:
        orm_mode = True


class ProductDetail(ProductBase):
    created_at: datetime
    updated_at: datetime
    attributes: Optional[Dict[str, Any]] = None
    variant_options: Optional[List[Dict[str, Any]]] = None


class RelatedProducts(BaseModel):
    product: ProductDetail
    related_products: List[ProductBase]
    
    class Config:
        orm_mode = True


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
    
    class Config:
        orm_mode = True


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
    
    class Config:
        orm_mode = True


class MenuItem(BaseModel):
    label: str
    url: str
    type: str
    items: Optional[List['MenuItem']] = None


class NavigationMenu(BaseModel):
    main_menu: List[MenuItem]
    footer_menu: Dict[str, List[MenuItem]]


# Update forward reference for nested menus
MenuItem.update_forward_refs()
