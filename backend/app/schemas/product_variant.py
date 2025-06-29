import uuid
from datetime import datetime
from typing import Dict, List, Optional, Union, Any

from pydantic import BaseModel, Field, validator


class VariantOptionValueBase(BaseModel):
    """Base schema for variant option value"""
    name: str
    display_order: int = 0
    metadata: Optional[Dict[str, Any]] = None


class VariantOptionValueCreate(VariantOptionValueBase):
    """Schema for creating a new variant option value"""
    pass


class VariantOptionValueUpdate(BaseModel):
    """Schema for updating a variant option value"""
    name: Optional[str] = None
    display_order: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class VariantOptionBase(BaseModel):
    """Base schema for variant option"""
    name: str
    type: str  # COLOR, SIZE, MATERIAL, STYLE, OTHER
    display_order: int = 0
    metadata: Optional[Dict[str, Any]] = None


class VariantOptionCreate(VariantOptionBase):
    """Schema for creating a new variant option"""
    values: List[VariantOptionValueCreate] = []


class VariantOptionUpdate(BaseModel):
    """Schema for updating a variant option"""
    name: Optional[str] = None
    type: Optional[str] = None
    display_order: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class ProductVariantBase(BaseModel):
    """Base schema for product variant"""
    sku: str
    name: Optional[str] = None
    price: Optional[float] = None
    inventory_quantity: int = 0
    image_url: Optional[str] = None
    barcode: Optional[str] = None
    weight: Optional[float] = None
    weight_unit: Optional[str] = None
    dimensions: Optional[Dict[str, Any]] = None
    is_default: bool = False


class ProductVariantCreate(ProductVariantBase):
    """Schema for creating a new product variant"""
    option_value_ids: List[uuid.UUID] = []


class ProductVariantUpdate(BaseModel):
    """Schema for updating a product variant"""
    sku: Optional[str] = None
    name: Optional[str] = None
    price: Optional[float] = None
    inventory_quantity: Optional[int] = None
    image_url: Optional[str] = None
    barcode: Optional[str] = None
    weight: Optional[float] = None
    weight_unit: Optional[str] = None
    dimensions: Optional[Dict[str, Any]] = None
    is_default: Optional[bool] = None
    option_value_ids: Optional[List[uuid.UUID]] = None


class VariantOptionValueInDB(VariantOptionValueBase):
    """Schema for variant option value as stored in DB"""
    id: uuid.UUID
    option_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    tenant_id: Optional[uuid.UUID] = None

    class Config:
        orm_mode = True


class VariantOptionInDB(VariantOptionBase):
    """Schema for variant option as stored in DB"""
    id: uuid.UUID
    product_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    tenant_id: Optional[uuid.UUID] = None
    values: List[VariantOptionValueInDB] = []

    class Config:
        orm_mode = True


class ProductVariantInDB(ProductVariantBase):
    """Schema for product variant as stored in DB"""
    id: uuid.UUID
    product_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    tenant_id: Optional[uuid.UUID] = None
    option_values: List[VariantOptionValueInDB] = []

    class Config:
        orm_mode = True


# Response schemas (public-facing)
class VariantOptionValue(VariantOptionValueBase):
    """Public schema for variant option value"""
    id: uuid.UUID

    class Config:
        orm_mode = True


class VariantOption(VariantOptionBase):
    """Public schema for variant option"""
    id: uuid.UUID
    values: List[VariantOptionValue] = []

    class Config:
        orm_mode = True


class ProductVariant(ProductVariantBase):
    """Public schema for product variant"""
    id: uuid.UUID
    option_values: List[VariantOptionValue] = []

    class Config:
        orm_mode = True


class ProductVariantWithAvailability(ProductVariant):
    """Product variant with availability information"""
    is_in_stock: bool = Field(..., description="Whether the variant is in stock")
    available_quantity: int = Field(..., description="Available quantity for purchase")
    
    @validator("is_in_stock", pre=True, always=True)
    def calculate_is_in_stock(cls, _, values):
        return values.get("inventory_quantity", 0) > 0
    
    @validator("available_quantity", pre=True, always=True)
    def calculate_available_quantity(cls, _, values):
        return max(0, values.get("inventory_quantity", 0))

    class Config:
        orm_mode = True
