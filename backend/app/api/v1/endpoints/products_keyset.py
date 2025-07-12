from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.errors.error_response import create_error_response
from backend.app.core.exceptions import DatabaseError
from backend.app.core.security.clerk_multi_org import MultiOrgClerkTokenData as ClerkTokenData
from backend.app.core.security.auth_deps import require_auth
from backend.app.api.deps import get_db
from backend.app.schemas.product import ProductResponse, ProductSearchParams
from backend.app.services.product_service import get_products_keyset

router = APIRouter()


class KeysetPaginationResponse(BaseModel):
    """Response model for keyset pagination"""

    items: List[ProductResponse]
    has_more: bool
    last_id: Optional[str] = None
    last_updated: Optional[datetime] = None


@router.get(
    "/products/keyset",
    response_model=KeysetPaginationResponse,
    summary="List products with keyset pagination",
    description="List products with efficient keyset pagination, ideal for large datasets",
    responses={
        200: {"description": "Products retrieved successfully"},
        401: {"description": "Not authenticated"},
        500: {"description": "Internal server error"},
    },
)
async def list_products_keyset(
    search_params: ProductSearchParams = Depends(),
    last_id: Optional[UUID] = None,
    last_updated: Optional[datetime] = None,
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
):
    """
    List all products with keyset pagination.

    Keyset pagination is more efficient than offset-based pagination for large datasets.
    It uses the ID and updated_at timestamp of the last item from the previous page to
    determine where to start the next page, avoiding the performance issues of large offsets.

    - Requires authentication
    - Supports the same filtering as regular product listing
    - Returns a list of products and a flag indicating if there are more items
    - Also returns the last_id and last_updated values for the next page request
    """
    try:
        # Get products with keyset pagination
        products, has_more = get_products_keyset(
            db=db,
            search_params=search_params,
            last_id=last_id,
            last_updated=last_updated,
        )

        # Prepare the response
        response = KeysetPaginationResponse(items=products, has_more=has_more)

        # If there are items, add the last item's ID and updated_at for the next page
        if products:
            last_product = products[-1]
            response.last_id = str(last_product.id)
            response.last_updated = last_product.updated_at

        return response

    except DatabaseError as e:
        return create_error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
            error_code="DATABASE_ERROR",
        )
