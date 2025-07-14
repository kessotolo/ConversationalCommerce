import uuid
from typing import Dict, List

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
from app.schemas.storefront_content import (
    CategoryInfo,
    NavigationMenu,
    PaginatedProducts,
    ProductBase,
    RelatedProducts,
    StorefrontMetadata,
)
from app.services import storefront_content_service

router = APIRouter()

# Cache control durations (in seconds)
CACHE_SHORT = 60  # 1 minute
CACHE_MEDIUM = 300  # 5 minutes
CACHE_LONG = 3600  # 1 hour
CACHE_VERY_LONG = 86400  # 24 hours


def set_cache_headers(response: Response, duration: int):
    """Set cache control headers for the response."""
    response.headers["Cache-Control"] = f"public, max-age={duration}"
    response.headers["Vary"] = "Accept-Encoding, Accept, X-Tenant-ID"


@router.get("/", response_model=StorefrontMetadata)
async def get_storefront_metadata(
    request: Request, response: Response, db: Session = Depends(get_db)
):
    """
    Get storefront metadata for SEO and Open Graph tags.
    """
    tenant_context = get_tenant_context(request)

    if not tenant_context["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    tenant_id = uuid.UUID(tenant_context["tenant_id"])
    metadata = await storefront_content_service.get_storefront_metadata(db, tenant_id)

    # Set cache headers - metadata changes infrequently
    set_cache_headers(response, CACHE_LONG)

    return metadata


@router.get("/layout", response_model=Dict)
async def get_storefront_layout(
    request: Request, response: Response, db: Session = Depends(get_db)
):
    """
    Get storefront layout configuration.
    """
    tenant_context = get_tenant_context(request)

    if not tenant_context["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    tenant_id = uuid.UUID(tenant_context["tenant_id"])
    layout = await storefront_content_service.get_storefront_layout(db, tenant_id)

    # Set cache headers - layout changes infrequently
    set_cache_headers(response, CACHE_LONG)

    return layout


@router.get("/navigation", response_model=NavigationMenu)
async def get_navigation_menu(
    request: Request, response: Response, db: Session = Depends(get_db)
):
    """
    Get navigation menu for the storefront.
    """
    tenant_context = get_tenant_context(request)

    if not tenant_context["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    tenant_id = uuid.UUID(tenant_context["tenant_id"])
    navigation = await storefront_content_service.get_navigation_menu(db, tenant_id)

    # Set cache headers - navigation changes sometimes
    set_cache_headers(response, CACHE_MEDIUM)

    return navigation


@router.get("/products/featured", response_model=List[ProductBase])
async def get_featured_products(
    request: Request,
    response: Response,
    limit: int = Query(8, ge=1, le=20),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Get featured products for storefront display.
    """
    tenant_context = get_tenant_context(request)

    if not tenant_context["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    tenant_id = uuid.UUID(tenant_context["tenant_id"])
    products = await storefront_content_service.get_featured_products(
        db, tenant_id, limit, skip
    )

    # Set cache headers - featured products change occasionally
    set_cache_headers(response, CACHE_MEDIUM)

    return products


@router.get("/categories", response_model=List[CategoryInfo])
async def get_product_categories(
    request: Request, response: Response, db: Session = Depends(get_db)
):
    """
    Get product categories for the storefront.
    """
    tenant_context = get_tenant_context(request)

    if not tenant_context["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    tenant_id = uuid.UUID(tenant_context["tenant_id"])
    categories = await storefront_content_service.get_product_categories(db, tenant_id)

    # Set cache headers - categories change occasionally
    set_cache_headers(response, CACHE_MEDIUM)

    return categories


@router.get("/categories/{category_slug}/products", response_model=PaginatedProducts)
async def get_products_by_category(
    request: Request,
    response: Response,
    category_slug: str = Path(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Get products by category for the storefront.
    """
    tenant_context = get_tenant_context(request)

    if not tenant_context["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    tenant_id = uuid.UUID(tenant_context["tenant_id"])

    # Convert slug back to category name
    category_name = category_slug.replace("-", " ").replace("and", "&")

    skip = (page - 1) * page_size
    products, total = await storefront_content_service.get_products_by_category(
        db, tenant_id, category_name, page_size, skip
    )

    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size

    # Set cache headers - product listings change frequently
    set_cache_headers(response, CACHE_SHORT)

    return {
        "items": products,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/products/{product_id}", response_model=RelatedProducts)
async def get_product_detail(
    request: Request,
    response: Response,
    product_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
):
    """
    Get detailed product information for the storefront.
    """
    tenant_context = get_tenant_context(request)

    if not tenant_context["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    tenant_id = uuid.UUID(tenant_context["tenant_id"])
    product_detail = await storefront_content_service.get_product_detail(
        db, tenant_id, product_id
    )

    # Set cache headers - product details change frequently
    set_cache_headers(response, CACHE_SHORT)

    return product_detail


@router.get("/search", response_model=PaginatedProducts)
async def search_products(
    request: Request,
    response: Response,
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Search for products in the storefront.
    """
    tenant_context = get_tenant_context(request)

    if not tenant_context["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    tenant_id = uuid.UUID(tenant_context["tenant_id"])

    skip = (page - 1) * page_size
    products, total = await storefront_content_service.search_products(
        db, tenant_id, q, page_size, skip
    )

    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size

    # No caching for search results
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    return {
        "items": products,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
