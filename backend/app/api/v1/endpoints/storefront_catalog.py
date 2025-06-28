import uuid
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path,
    Query,
    Request,
    Response,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant_context
from app.schemas.storefront_product import (
    CollectionInfo,
    PaginatedStorefrontProducts,
    StorefrontProductBase,
    StorefrontProductWithVariants,
    TagInfo,
)
from app.services import storefront_product_service

router = APIRouter()

# Cache control durations (in seconds)
CACHE_SHORT = 60  # 1 minute
CACHE_MEDIUM = 300  # 5 minutes
CACHE_LONG = 3600  # 1 hour


def set_cache_headers(response: Response, duration: int):
    """Set cache control headers for the response."""
    response.headers["Cache-Control"] = f"public, max-age={duration}"
    response.headers["Vary"] = "Accept-Encoding, Accept, X-Tenant-ID"


@router.get("/products", response_model=PaginatedStorefrontProducts)
async def get_storefront_products(
    request: Request,
    response: Response,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", description="Sort order (asc or desc)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    collection: Optional[str] = Query(None, description="Filter by collection"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    price_min: Optional[float] = Query(None, ge=0, description="Minimum price"),
    price_max: Optional[float] = Query(None, ge=0, description="Maximum price"),
    search_query: Optional[str] = Query(None, description="Search query"),
    featured_only: bool = Query(False, description="Only show featured products"),
    db: Session = Depends(get_db),
):
    """
    Get products for storefront display with filtering, sorting, and pagination.
    """
    tenant_context = get_tenant_context(request)

    if not tenant_context["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    tenant_id = uuid.UUID(tenant_context["tenant_id"])

    products, total = await storefront_product_service.get_storefront_products(
        db=db,
        tenant_id=tenant_id,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        category=category,
        collection=collection,
        tags=tags,
        price_min=price_min,
        price_max=price_max,
        search_query=search_query,
        featured_only=featured_only,
    )

    # Transform images for each product
    transformed_products = []
    for product in products:
        # Convert product to dict for transformation
        product_dict = {
            key: getattr(product, key)
            for key in product.__dict__
            if not key.startswith("_")
        }
        transformed = await storefront_product_service.transform_product_images(
            product_dict
        )
        transformed_products.append(transformed)

    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size

    # Set cache headers - product listings change frequently
    set_cache_headers(response, CACHE_SHORT)

    return {
        "items": transformed_products,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/products/{product_id}", response_model=StorefrontProductWithVariants)
async def get_product_detail(
    request: Request,
    response: Response,
    product_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
):
    """
    Get detailed product information with variants and related products.
    """
    tenant_context = get_tenant_context(request)

    if not tenant_context["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    tenant_id = uuid.UUID(tenant_context["tenant_id"])

    # Get product detail with variants and related products
    product_data = await storefront_product_service.get_product_detail_for_storefront(
        db, tenant_id, product_id
    )

    # Transform images for main product
    main_product = {
        key: getattr(product_data["product"], key)
        for key in product_data["product"].__dict__
        if not key.startswith("_")
    }
    transformed_main = await storefront_product_service.transform_product_images(
        main_product
    )

    # Transform images for related products
    transformed_related = []
    for product in product_data["related_products"]:
        product_dict = {
            key: getattr(product, key)
            for key in product.__dict__
            if not key.startswith("_")
        }
        transformed = await storefront_product_service.transform_product_images(
            product_dict
        )
        transformed_related.append(transformed)

    # Transform images for recommended products
    transformed_recommended = []
    for product in product_data["recommended_products"]:
        product_dict = {
            key: getattr(product, key)
            for key in product.__dict__
            if not key.startswith("_")
        }
        transformed = await storefront_product_service.transform_product_images(
            product_dict
        )
        transformed_recommended.append(transformed)

    # Transform images for variants
    transformed_variants = []
    for product in product_data["variants"]:
        product_dict = {
            key: getattr(product, key)
            for key in product.__dict__
            if not key.startswith("_")
        }
        transformed = await storefront_product_service.transform_product_images(
            product_dict
        )
        transformed_variants.append(transformed)

    # Set cache headers - product details change frequently
    set_cache_headers(response, CACHE_SHORT)

    return {
        "product": transformed_main,
        "variants": transformed_variants,
        "variant_options": product_data["variant_options"],
        "related_products": transformed_related,
        "recommended_products": transformed_recommended,
    }


@router.get("/collections", response_model=List[CollectionInfo])
async def get_product_collections(
    request: Request, response: Response, db: Session = Depends(get_db)
):
    """
    Get product collections for the storefront.
    """
    tenant_context = get_tenant_context(request)

    if not tenant_context["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    tenant_id = uuid.UUID(tenant_context["tenant_id"])
    collections = await storefront_product_service.get_product_collections(
        db, tenant_id
    )

    # Set cache headers - collections change occasionally
    set_cache_headers(response, CACHE_MEDIUM)

    return collections


@router.get("/tags", response_model=List[TagInfo])
async def get_product_tags(
    request: Request,
    response: Response,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Get product tags for the storefront.
    """
    tenant_context = get_tenant_context(request)

    if not tenant_context["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    tenant_id = uuid.UUID(tenant_context["tenant_id"])
    tags = await storefront_product_service.get_product_tags(db, tenant_id, limit)

    # Set cache headers - tags change occasionally
    set_cache_headers(response, CACHE_MEDIUM)

    return tags


@router.get("/new-arrivals", response_model=List[StorefrontProductBase])
async def get_new_arrivals(
    request: Request,
    response: Response,
    limit: int = Query(8, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """
    Get new product arrivals for the storefront.
    """
    tenant_context = get_tenant_context(request)

    if not tenant_context["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    tenant_id = uuid.UUID(tenant_context["tenant_id"])
    products = await storefront_product_service.get_new_arrivals(db, tenant_id, limit)

    # Transform images for each product
    transformed_products = []
    for product in products:
        product_dict = {
            key: getattr(product, key)
            for key in product.__dict__
            if not key.startswith("_")
        }
        transformed = await storefront_product_service.transform_product_images(
            product_dict
        )
        transformed_products.append(transformed)

    # Set cache headers - new arrivals change frequently
    set_cache_headers(response, CACHE_SHORT)

    return transformed_products


@router.get("/bestsellers", response_model=List[StorefrontProductBase])
async def get_bestsellers(
    request: Request,
    response: Response,
    limit: int = Query(8, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """
    Get bestselling products for the storefront.
    """
    tenant_context = get_tenant_context(request)

    if not tenant_context["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    tenant_id = uuid.UUID(tenant_context["tenant_id"])
    products = await storefront_product_service.get_bestsellers(db, tenant_id, limit)

    # Transform images for each product
    transformed_products = []
    for product in products:
        product_dict = {
            key: getattr(product, key)
            for key in product.__dict__
            if not key.startswith("_")
        }
        transformed = await storefront_product_service.transform_product_images(
            product_dict
        )
        transformed_products.append(transformed)

    # Set cache headers - bestsellers change occasionally
    set_cache_headers(response, CACHE_MEDIUM)

    return transformed_products
