from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from backend.app.core.security.clerk_multi_org import MultiOrgClerkTokenData as ClerkTokenData
from backend.app.core.security.role_based_auth import require_seller
from backend.app.api.deps import get_db
from backend.app.services.audit_service import (
    AuditActionType,
    AuditResourceType,
    create_audit_log,
)
from backend.app.services.product_service import batch_update_products

router = APIRouter()


class ProductBatchUpdateItem(BaseModel):
    """Schema for a product in a batch update operation"""

    product_id: UUID = Field(..., description="Product ID to update")


class ProductBatchUpdatePayload(BaseModel):
    """Schema for batch updating products"""

    products: List[ProductBatchUpdateItem] = Field(
        ..., min_length=1, max_length=100, description="List of products to update"
    )
    update_data: Dict[str, Any] = Field(
        ..., description="Fields to update for all products"
    )

    @field_validator("update_data")
    def validate_update_data(cls, v):
        """Validate that seller_id is not in update_data as it can't be changed"""
        if "seller_id" in v:
            raise ValueError("seller_id cannot be updated")

        # Ensure there are fields to update
        if not v:
            raise ValueError("update_data cannot be empty")

        return v


@router.post(
    "/products/batch",
    summary="Batch update multiple products",
    description="Update multiple products at once for better performance",
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "Products updated successfully"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized to update some products"},
        422: {"description": "Validation error"},
    },
)
async def batch_update_products_endpoint(
    payload: ProductBatchUpdatePayload,
    request: Request,
    db: Session = Depends(get_db),
    current_user: ClerkTokenData = Depends(
        require_seller),  # Require seller role
):
    """
    Batch update multiple products at once.
    This endpoint is optimized for performance when updating many products.

    Only the owner of the products (or an admin) can update them.
    """
    try:
        # Extract product IDs
        product_ids = [item.product_id for item in payload.products]

        # Perform batch update
        updated_count = batch_update_products(
            db=db,
            product_ids=product_ids,
            update_data=payload.update_data,
            seller_id=current_user.user_id,
        )

        # Log the action for audit purposes
        create_audit_log(
            db=db,
            user_id=current_user.user_id,
            action=AuditActionType.UPDATE,
            resource_type=AuditResourceType.PRODUCT,
            resource_id="batch",
            details={
                "product_ids": [str(pid) for pid in product_ids],
                "fields_updated": list(payload.update_data.keys()),
                "count": updated_count,
            },
            request=request,
        )

        return {
            "message": f"Successfully updated {updated_count} products",
            "updated_count": updated_count,
        }

    except Exception:
        # Let the exception handlers handle specific errors
        raise
