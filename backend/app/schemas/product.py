from pydantic import BaseModel, Field, HttpUrl, validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
import re


class ProductBase(BaseModel):
    name: str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="Product name (3-100 characters)"
    )
    description: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="Product description (10-2000 characters)"
    )
    price: float = Field(
        ...,
        gt=0,
        le=1000000,
        description="Product price (greater than 0, max 1,000,000)"
    )
    image_url: Optional[HttpUrl] = Field(
        None,
        description="URL of the product image"
    )
    video_url: Optional[HttpUrl] = Field(
        None,
        description="URL of the product video"
    )
    whatsapp_status_url: Optional[HttpUrl] = Field(
        None,
        description="URL of the WhatsApp status video"
    )
    instagram_story_url: Optional[HttpUrl] = Field(
        None,
        description="URL of the Instagram story video"
    )
    is_featured: bool = Field(
        False,
        description="Whether the product is featured in social media"
    )

    @validator('name')
    def name_must_be_valid(cls, v):
        if not re.match(r'^[a-zA-Z0-9\s\-_]+$', v):
            raise ValueError(
                'Name can only contain letters, numbers, spaces, hyphens, and underscores')
        return v

    @validator('price')
    def price_must_have_two_decimals(cls, v):
        if round(v, 2) != v:
            raise ValueError('Price must have at most 2 decimal places')
        return v


class ProductCreate(ProductBase):
    seller_id: UUID


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(
        None,
        min_length=3,
        max_length=100,
        description="Product name (3-100 characters)"
    )
    description: Optional[str] = Field(
        None,
        min_length=10,
        max_length=2000,
        description="Product description (10-2000 characters)"
    )
    price: Optional[float] = Field(
        None,
        gt=0,
        le=1000000,
        description="Product price (greater than 0, max 1,000,000)"
    )
    image_url: Optional[HttpUrl] = Field(
        None,
        description="URL of the product image"
    )
    video_url: Optional[HttpUrl] = Field(
        None,
        description="URL of the product video"
    )
    whatsapp_status_url: Optional[HttpUrl] = Field(
        None,
        description="URL of the WhatsApp status video"
    )
    instagram_story_url: Optional[HttpUrl] = Field(
        None,
        description="URL of the Instagram story video"
    )
    is_featured: Optional[bool] = Field(
        None,
        description="Whether the product is featured in social media"
    )

    @validator('name')
    def name_must_be_valid(cls, v):
        if v is not None and not re.match(r'^[a-zA-Z0-9\s\-_]+$', v):
            raise ValueError(
                'Name can only contain letters, numbers, spaces, hyphens, and underscores')
        return v

    @validator('price')
    def price_must_have_two_decimals(cls, v):
        if v is not None and round(v, 2) != v:
            raise ValueError('Price must have at most 2 decimal places')
        return v


class ProductInDB(ProductBase):
    id: UUID
    seller_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductResponse(ProductInDB):
    pass


class ProductSearchParams(BaseModel):
    query: Optional[str] = Field(
        None, description="Search query for product name or description")
    min_price: Optional[float] = Field(
        None, gt=0, description="Minimum price filter")
    max_price: Optional[float] = Field(
        None, gt=0, description="Maximum price filter")
    seller_id: Optional[UUID] = Field(None, description="Filter by seller ID")
    has_video: Optional[bool] = Field(
        None, description="Filter products with video content")
    is_featured: Optional[bool] = Field(
        None, description="Filter featured products")
    sort_by: Optional[str] = Field(
        None,
        description="Sort field (name, price, created_at)",
        pattern="^(name|price|created_at)$"
    )
    sort_order: Optional[str] = Field(
        None,
        description="Sort order (asc, desc)",
        pattern="^(asc|desc)$"
    )
    page: int = Field(1, ge=1, description="Page number")
    limit: int = Field(10, ge=1, le=100, description="Items per page")

    @validator('max_price')
    def max_price_must_be_greater_than_min_price(cls, v, values):
        if v is not None and 'min_price' in values and values['min_price'] is not None:
            if v < values['min_price']:
                raise ValueError('max_price must be greater than min_price')
        return v
