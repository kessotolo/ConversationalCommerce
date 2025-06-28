import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.core.exceptions import (
    DatabaseError,
    ProductNotFoundError,
    ProductPermissionError,
    ProductValidationError,
)
from app.core.security.clerk import ClerkTokenData
from app.core.security.dependencies import require_auth
from app.api.deps import get_db
from app.schemas.product import (
    PaginatedResponse,
    ProductCreate,
    ProductResponse,
    ProductSearchParams,
    ProductUpdate,
)
from app.services.product_service import (
    create_product,
    delete_product,
    get_product,
    get_products,
    update_product,
)

router = APIRouter()


@router.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product",
    responses={
        201: {"description": "Product created successfully"},
        400: {"description": "Invalid input data"},
        401: {"description": "Not authenticated"},
        500: {"description": "Internal server error"},
    },
)
async def create_product_endpoint(
    product_in: ProductCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
):
    """
    Create a new product for the authenticated seller.

    - Requires authentication
    - Validates all input fields
    - Returns the created product
    """
    # Add debug logging
    logger.debug(f"create_product_endpoint called with user: {user.sub}, tenant_context: {getattr(request.state, 'tenant_context', None)}")
    logger.debug(f"Request headers: {request.headers}")
    
    # Check if tenant_id is available in request state
    tenant_id = getattr(request.state, "tenant_id", None)
    logger.debug(f"Tenant ID in request state: {tenant_id}")
    
    # Check for seller permission
    if hasattr(user, "metadata") and user.metadata:
        logger.debug(f"User metadata: {user.metadata}")
    else:
        logger.debug("No user metadata available")
    
    try:
        product = await create_product(db, product_in, request)
        logger.debug(f"Product created successfully: {product.id}")
        return product
    except ProductValidationError as e:
        logger.error(f"Product validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ProductPermissionError as e:
        logger.error(f"Product permission error: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except DatabaseError as e:
        logger.error(f"Database error creating product: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating product",
        )


@router.get(
    "/products",
    response_model=PaginatedResponse,
    summary="List all products",
    responses={
        200: {"description": "List of products retrieved successfully"},
        401: {"description": "Not authenticated"},
        500: {"description": "Internal server error"},
    },
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
            offset=search_params.offset,
        )
    except DatabaseError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching products",
        )


@router.get(
    "/products/{product_id}",
    response_model=ProductResponse,
    summary="Get a single product by ID",
    responses={
        200: {"description": "Product retrieved successfully"},
        401: {"description": "Not authenticated"},
        404: {"description": "Product not found"},
        500: {"description": "Internal server error"},
    },
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
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DatabaseError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching product",
        )


@router.patch(
    "/products/{product_id}",
    response_model=ProductResponse,
    summary="Update a product by ID",
    responses={
        200: {"description": "Product updated successfully"},
        400: {"description": "Invalid input data"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized to update this product"},
        404: {"description": "Product not found"},
        500: {"description": "Internal server error"},
    },
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
        product = await update_product(db, product_id, product_in, user.sub)
        return product
    except ProductNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ProductPermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ProductValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        )
    except DatabaseError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating product",
        )


@router.delete(
    "/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a product by ID",
    responses={
        204: {"description": "Product deleted successfully"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized to delete this product"},
        404: {"description": "Product not found"},
        500: {"description": "Internal server error"},
    },
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
        await delete_product(db, product_id, user.sub)
        return None
    except ProductNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ProductPermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except DatabaseError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting product",
        )
