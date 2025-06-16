from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class ProductBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str = Field(
        ..., min_length=1, max_length=100, description="Product name (1-100 characters)"
    )
    description: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Product description (1-1000 characters)",
    )
    price: Decimal = Field(
        ..., gt=0, decimal_places=2, description="Product price (greater than 0)"
    )
    image_url: Optional[HttpUrl] = Field(None, description="URL of the product image")
    video_url: Optional[HttpUrl] = Field(None, description="URL of the product video")
    whatsapp_status_url: Optional[HttpUrl] = Field(
        None, description="URL of the WhatsApp status video"
    )
    instagram_story_url: Optional[HttpUrl] = Field(
        None, description="URL of the Instagram story video"
    )
    is_featured: bool = Field(
        False, description="Whether the product is featured in social media"
    )
    show_on_storefront: bool = Field(True, description="Show product on storefront")
    show_on_whatsapp: bool = Field(True, description="Show product on WhatsApp")
    show_on_instagram: bool = Field(False, description="Show product on Instagram")
    whatsapp_caption: Optional[str] = Field(
        None, description="Caption for WhatsApp status"
    )
    storefront_url: Optional[HttpUrl] = Field(
        None, description="URL for the product on the storefront"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError("Name cannot be empty")
        if not all(c.isalnum() or c.isspace() or c in "-_" for c in v):
            raise ValueError(
                "Name can only contain letters, numbers, spaces, hyphens, and underscores"
            )
        return v.strip()

    @field_validator("price")
    @classmethod
    def validate_price(cls, v):
        if not isinstance(v, (int, float, Decimal)):
            raise ValueError("Price must be a number")
        if v <= 0:
            raise ValueError("Price must be greater than 0")
        return Decimal(str(v)).quantize(Decimal("0.01"))


class ProductCreate(ProductBase):
    seller_id: Optional[UUID] = None  # Will be set by the endpoint


class ProductUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="Product name (1-100 characters)",
    )
    description: Optional[str] = Field(
        None,
        min_length=1,
        max_length=1000,
        description="Product description (1-1000 characters)",
    )
    price: Optional[Decimal] = Field(
        None, gt=0, decimal_places=2, description="Product price (greater than 0)"
    )
    image_url: Optional[HttpUrl] = Field(None, description="URL of the product image")
    video_url: Optional[HttpUrl] = Field(None, description="URL of the product video")
    whatsapp_status_url: Optional[HttpUrl] = Field(
        None, description="URL of the WhatsApp status video"
    )
    instagram_story_url: Optional[HttpUrl] = Field(
        None, description="URL of the Instagram story video"
    )
    is_featured: Optional[bool] = Field(
        None, description="Whether the product is featured in social media"
    )
    show_on_storefront: Optional[bool] = Field(
        None, description="Show product on storefront"
    )
    show_on_whatsapp: Optional[bool] = Field(
        None, description="Show product on WhatsApp"
    )
    show_on_instagram: Optional[bool] = Field(
        None, description="Show product on Instagram"
    )
    whatsapp_caption: Optional[str] = Field(
        None, description="Caption for WhatsApp status"
    )
    storefront_url: Optional[HttpUrl] = Field(
        None, description="URL for the product on the storefront"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if v is not None:
            if not v.strip():
                raise ValueError("Name cannot be empty")
            if not all(c.isalnum() or c.isspace() or c in "-_" for c in v):
                raise ValueError(
                    "Name can only contain letters, numbers, spaces, hyphens, and underscores"
                )
            return v.strip()
        return v

    @field_validator("price")
    @classmethod
    def validate_price(cls, v):
        if v is not None:
            if not isinstance(v, (int, float, Decimal)):
                raise ValueError("Price must be a number")
            if v <= 0:
                raise ValueError("Price must be greater than 0")
            return Decimal(str(v)).quantize(Decimal("0.01"))
        return v


class ProductInDB(ProductBase):
    id: UUID
    seller_id: UUID
    created_at: datetime
    updated_at: datetime


class ProductResponse(ProductInDB):
    is_deleted: bool = False


class PaginatedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: List[ProductResponse]
    total: int
    limit: int
    offset: int


class ProductSearchParams(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    search: Optional[str] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    featured: Optional[bool] = None
    show_on_storefront: Optional[bool] = None
    limit: int = 10
    offset: int = 0

    @field_validator("max_price")
    @classmethod
    def validate_price_range(cls, v, info):
        if (
            v is not None
            and "min_price" in info.data
            and info.data["min_price"] is not None
        ):
            if v < info.data["min_price"]:
                raise ValueError("max_price must be greater than min_price")
        return v
