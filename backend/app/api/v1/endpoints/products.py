from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.core.security.dependencies import require_auth
from app.core.security.clerk import ClerkTokenData
from app.db.session import get_db
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductSearchParams,
    PaginatedResponse
)
from app.services.product_service import (
    create_product,
    get_product,
    get_products,
    update_product,
    delete_product,
)
from app.core.exceptions import (
    ProductNotFoundError,
    ProductPermissionError,
    ProductValidationError,
    DatabaseError
)

router = APIRouter()


@router.post("/products",
             response_model=ProductResponse,
             status_code=status.HTTP_201_CREATED,
             summary="Create a new product",
             responses={
                 201: {"description": "Product created successfully"},
                 400: {"description": "Invalid input data"},
                 401: {"description": "Not authenticated"},
                 500: {"description": "Internal server error"}
             }
             )
async def create_product_endpoint(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
):
    """
    Create a new product for the authenticated seller.

    - Requires authentication
    - Validates all input fields
    - Returns the created product
    """
    try:
        # Convert string UUID from auth token to proper UUID object
        # The ClerkTokenData.sub is a string, but ProductCreate expects a UUID
        from uuid import UUID
        
        # Assign the user ID from the token to the product
        product_in.seller_id = UUID(user.sub)
        
        # Create the product
        product = create_product(db, product_in)
        return product
    except ValueError as e:
        # This could happen if the UUID conversion fails
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid seller ID format: {str(e)}"
        )
    except ProductValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating product: {str(e)}"
        )
    except Exception as e:
        # Catch any unexpected errors and log them
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )


@router.get("/products",
            response_model=PaginatedResponse,
            summary="List all products",
            responses={
                200: {"description": "List of products retrieved successfully"},
                401: {"description": "Not authenticated"},
                500: {"description": "Internal server error"}
            }
            )
async def list_products_endpoint(
    search_params: ProductSearchParams = Depends(),
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
):
    """
    List all products with optional filtering and pagination.

    - Requires authentication
    - Supports filtering by various parameters
    - Supports pagination
    - Returns a paginated list of products
    """
    try:
        products, total = get_products(db, search_params)
        return PaginatedResponse(
            items=products,
            total=total,
            limit=search_params.limit,
            offset=search_params.offset
        )
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching products"
        )


@router.get("/products/{product_id}",
            response_model=ProductResponse,
            summary="Get a single product by ID",
            responses={
                200: {"description": "Product retrieved successfully"},
                401: {"description": "Not authenticated"},
                404: {"description": "Product not found"},
                500: {"description": "Internal server error"}
            }
            )
async def get_product_endpoint(
    product_id: UUID,
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
):
    """
    Retrieve a single product by its ID.

    - Requires authentication
    - Returns 404 if product not found
    - Returns the product if found
    """
    try:
        product = get_product(db, product_id)
        if not product:
            raise ProductNotFoundError(
                f"Product with ID {product_id} not found")
        return product
    except ProductNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching product"
        )


@router.patch("/products/{product_id}",
              response_model=ProductResponse,
              summary="Update a product by ID",
              responses={
                  200: {"description": "Product updated successfully"},
                  400: {"description": "Invalid input data"},
                  401: {"description": "Not authenticated"},
                  403: {"description": "Not authorized to update this product"},
                  404: {"description": "Product not found"},
                  500: {"description": "Internal server error"}
              }
              )
async def update_product_endpoint(
    product_id: UUID,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
):
    """
    Update a product by its ID. Only the owner can update.

    - Requires authentication
    - Validates all input fields
    - Checks product ownership
    - Returns the updated product
    """
    try:
        product = update_product(db, product_id, product_in, user.sub)
        return product
    except ProductNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ProductPermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except ProductValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating product"
        )


@router.delete("/products/{product_id}",
               status_code=status.HTTP_204_NO_CONTENT,
               summary="Delete a product by ID",
               responses={
                   204: {"description": "Product deleted successfully"},
                   401: {"description": "Not authenticated"},
                   403: {"description": "Not authorized to delete this product"},
                   404: {"description": "Product not found"},
                   500: {"description": "Internal server error"}
               }
               )
async def delete_product_endpoint(
    product_id: UUID,
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
):
    """
    Soft delete a product by its ID. Only the owner can delete.

    - Requires authentication
    - Checks product ownership
    - Performs soft delete
    - Returns 204 on success
    """
    try:
        delete_product(db, product_id, user.sub)
        return None
    except ProductNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ProductPermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting product"
        )
