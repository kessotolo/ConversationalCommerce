from fastapi import APIRouter, Depends, HTTPException
from app.core.security.dependencies import require_auth
from app.core.security.clerk import ClerkTokenData
from pydantic import BaseModel
from typing import List

router = APIRouter()


class Product(BaseModel):
    name: str
    description: str
    price: float


@router.post("/products")
async def create_product(
    product: Product,
    user: ClerkTokenData = Depends(require_auth)
):
    # Here you would typically save the product to your database
    return {
        "message": "Product created successfully",
        "product": product,
        "created_by": user.sub
    }


@router.get("/products")
async def get_products(user: ClerkTokenData = Depends(require_auth)):
    # Here you would typically fetch products from your database
    return {
        "message": "Products retrieved successfully",
        "products": []  # Replace with actual products from database
    }
