from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.core.security.dependencies import require_auth
from app.core.security.clerk import ClerkTokenData
from app.db.session import get_db
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.services.product_service import (
    create_product,
    get_product,
    get_products,
    update_product,
    delete_product,
)

router = APIRouter()


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED, summary="Create a new product")
def create_product_endpoint(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
):
    """
    Create a new product for the authenticated seller.
    """
    product_in.seller_id = user.sub
    product = create_product(db, product_in)
    return product


@router.get("/products", response_model=List[ProductResponse], summary="List all products")
def list_products_endpoint(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
):
    """
    List all products for the authenticated seller (paginated).
    """
    products = get_products(db, skip=skip, limit=limit)
    return products


@router.get("/products/{product_id}", response_model=ProductResponse, summary="Get a single product by ID")
def get_product_endpoint(
    product_id: UUID,
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
):
    """
    Retrieve a single product by its ID.
    """
    product = get_product(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.put("/products/{product_id}", response_model=ProductResponse, summary="Update a product by ID")
def update_product_endpoint(
    product_id: UUID,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
):
    """
    Update a product by its ID. Only the owner can update.
    """
    product = update_product(db, product_id, product_in, user.sub)
    return product


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a product by ID")
def delete_product_endpoint(
    product_id: UUID,
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
):
    """
    Soft delete a product by its ID. Only the owner can delete.
    """
    delete_product(db, product_id, user.sub)
    return None
