from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=1000)
    price: float = Field(..., gt=0)
    image_url: Optional[str] = None


class ProductCreate(ProductBase):
    seller_id: UUID


class ProductResponse(ProductBase):
    id: UUID
    seller_id: UUID

    class Config:
        from_attributes = True
