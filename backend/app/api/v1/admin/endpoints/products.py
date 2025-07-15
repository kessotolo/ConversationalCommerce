"""
Admin Products Endpoints

Merchant-specific product management for admin dashboard.
"""
import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    DatabaseError,
    ProductNotFoundError,
    ProductPermissionError,
    ProductValidationError,
)
from app.core.security.dependencies import get_current_admin_or_seller
from app.core.security.clerk_multi_org import MultiOrgClerkTokenData
from app.db.deps import get_db
from app.models.product import Product
from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    ProductSearchParams,
    PaginatedResponse,
)
from app.services.product_service import (
    create_product,
    get_product,
    get_products,
    update_product,
    delete_product,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=PaginatedResponse, summary="List all products for the merchant")
async def list_products(
    search_params: ProductSearchParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """List all products for the current merchant (admin view)."""
    try:
        logger.info(f"Listing products for user: {current_user.user_id}")

        # Get products using the service layer
        products, total = get_products(db, search_params)

        # Convert to response format
        product_responses = [ProductResponse.model_validate(
            product) for product in products]

        return PaginatedResponse(
            items=product_responses,
            total=total,
            limit=search_params.limit,
            offset=search_params.offset,
        )
    except DatabaseError as e:
        logger.error(f"Database error listing products: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve products",
        )
    except Exception as e:
        logger.error(f"Unexpected error listing products: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )


@router.get("/{product_id}", response_model=ProductResponse, summary="Get product details")
async def get_product_detail(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Get details for a specific product (admin view)."""
    try:
        logger.info(
            f"Getting product {product_id} for user: {current_user.user_id}")

        # Get product using the service layer
        product = get_product(db, product_id)

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {product_id} not found",
            )

        return ProductResponse.model_validate(product)
    except DatabaseError as e:
        logger.error(f"Database error getting product {product_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve product",
        )
    except Exception as e:
        logger.error(
            f"Unexpected error getting product {product_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )


@router.post("/", response_model=ProductResponse, summary="Create a new product")
async def create_new_product(
    product_data: ProductCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Create a new product for the merchant (admin view)."""
    try:
        logger.info(f"Creating product for user: {current_user.user_id}")

        # Set seller_id from authenticated user
        product_data.seller_id = UUID(current_user.user_id)

        # Create product using the service layer
        product = await create_product(db, product_data, request)

        logger.info(f"Product created successfully: {product.id}")
        return ProductResponse.model_validate(product)
    except ProductValidationError as e:
        logger.warning(f"Product validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except DatabaseError as e:
        logger.error(f"Database error creating product: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create product",
        )
    except Exception as e:
        logger.error(f"Unexpected error creating product: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )


@router.put("/{product_id}", response_model=ProductResponse, summary="Update a product")
async def update_existing_product(
    product_id: UUID,
    product_data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Update an existing product (admin view)."""
    try:
        logger.info(
            f"Updating product {product_id} for user: {current_user.user_id}")

        # Update product using the service layer
        product = await update_product(db, product_id, product_data, UUID(current_user.user_id))

        logger.info(f"Product updated successfully: {product.id}")
        return ProductResponse.model_validate(product)
    except ProductNotFoundError as e:
        logger.warning(f"Product not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ProductPermissionError as e:
        logger.warning(f"Product permission error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except ProductValidationError as e:
        logger.warning(f"Product validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except DatabaseError as e:
        logger.error(f"Database error updating product {product_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update product",
        )
    except Exception as e:
        logger.error(
            f"Unexpected error updating product {product_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )


@router.delete("/{product_id}", summary="Delete a product")
async def delete_existing_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Delete a product (admin view)."""
    try:
        logger.info(
            f"Deleting product {product_id} for user: {current_user.user_id}")

        # Delete product using the service layer
        await delete_product(db, product_id, UUID(current_user.user_id))

        logger.info(f"Product deleted successfully: {product_id}")
        return {"message": "Product deleted successfully"}
    except ProductNotFoundError as e:
        logger.warning(f"Product not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ProductPermissionError as e:
        logger.warning(f"Product permission error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except DatabaseError as e:
        logger.error(f"Database error deleting product {product_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete product",
        )
    except Exception as e:
        logger.error(
            f"Unexpected error deleting product {product_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )
