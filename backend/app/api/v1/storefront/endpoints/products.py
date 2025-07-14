"""
Storefront Products API endpoints.

Provides product browsing functionality for customers.
No authentication required for browsing products.
Optimized for performance and customer experience.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.models.tenant import Tenant
from app.models.product import Product
from app.schemas.product import (
    ProductResponse,
    PaginatedResponse,
    ProductSearchParams
)

router = APIRouter()


async def get_tenant_from_subdomain(
    subdomain: str,
    db: AsyncSession = Depends(get_db)
) -> Tenant:
    """
    Get tenant from subdomain for storefront access.

    This allows customers to browse products without authentication
    by resolving the tenant from the subdomain.
    """
    # Query tenant by subdomain
    tenant_query = select(Tenant).where(
        Tenant.subdomain == subdomain,
        Tenant.is_active == True
    )
    tenant_result = await db.execute(tenant_query)
    tenant = tenant_result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )

    return tenant


@router.get("/", response_model=PaginatedResponse)
async def list_storefront_products(
    subdomain: str = Query(..., description="Store subdomain"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at", regex="^(name|price|created_at)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db)
) -> PaginatedResponse:
    """
    List products for customer browsing.

    No authentication required. Products are filtered by
    the store's subdomain and optimized for performance.
    """
    try:
        # Get tenant from subdomain
        tenant = await get_tenant_from_subdomain(subdomain, db)

        # Build query
        query = select(Product).where(
            Product.tenant_id == tenant.id,
            Product.is_active == True
        )

        # Apply filters
        if category:
            query = query.where(Product.category == category)

        if search:
            search_term = f"%{search}%"
            query = query.where(
                Product.name.ilike(search_term) |
                Product.description.ilike(search_term)
            )

        # Apply sorting
        if sort_by == "name":
            order_column = Product.name
        elif sort_by == "price":
            order_column = Product.price
        else:
            order_column = Product.created_at

        if sort_order == "asc":
            query = query.order_by(order_column.asc())
        else:
            query = query.order_by(order_column.desc())

        # Get total count
        count_query = select(func.count(Product.id)).where(
            Product.tenant_id == tenant.id,
            Product.is_active == True
        )
        count_result = await db.execute(count_query)
        total = count_result.scalar()

        # Apply pagination
        query = query.offset(skip).limit(limit)

        # Execute query
        result = await db.execute(query)
        products = result.scalars().all()

        return PaginatedResponse(
            items=products,
            total=total,
            limit=limit,
            offset=skip
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching products: {str(e)}"
        )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_storefront_product(
    product_id: str,
    subdomain: str = Query(..., description="Store subdomain"),
    db: AsyncSession = Depends(get_db)
) -> ProductResponse:
    """
    Get a specific product for customer viewing.

    No authentication required. Product is scoped to the store's tenant.
    """
    try:
        # Get tenant from subdomain
        tenant = await get_tenant_from_subdomain(subdomain, db)

        # Get product
        product_query = select(Product).where(
            Product.id == product_id,
            Product.tenant_id == tenant.id,
            Product.is_active == True
        )
        product_result = await db.execute(product_query)
        product = product_result.scalar_one_or_none()

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )

        return product

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching product: {str(e)}"
        )


@router.get("/categories/list", response_model=List[str])
async def list_product_categories(
    subdomain: str = Query(..., description="Store subdomain"),
    db: AsyncSession = Depends(get_db)
) -> List[str]:
    """
    List all product categories for the store.

    Used for filtering and navigation in the storefront.
    """
    try:
        # Get tenant from subdomain
        tenant = await get_tenant_from_subdomain(subdomain, db)

        # Get unique categories
        categories_query = select(Product.category).where(
            Product.tenant_id == tenant.id,
            Product.is_active == True,
            Product.category.isnot(None)
        ).distinct()

        categories_result = await db.execute(categories_query)
        categories = [row[0] for row in categories_result.fetchall()]

        return categories

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching categories: {str(e)}"
        )
