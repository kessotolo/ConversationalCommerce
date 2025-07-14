"""
Storefront API module for customer-facing endpoints.

This module provides the API structure for merchant storefronts
following the pattern: {merchant-id}.enwhe.io

All endpoints are scoped to specific merchants and optimized
for customer browsing and shopping experience.
"""

from fastapi import APIRouter

from app.app.api.v1.storefront.endpoints import (
    products,
    categories,
    cart,
    checkout,
    search,
)

# Main storefront API router for customer-facing endpoints
storefront_router = APIRouter(prefix="/storefront", tags=["storefront"])

# Include all storefront routers
storefront_router.include_router(
    products.router, prefix="/products", tags=["products"])
storefront_router.include_router(
    categories.router, prefix="/categories", tags=["categories"])
storefront_router.include_router(cart.router, prefix="/cart", tags=["cart"])
storefront_router.include_router(
    checkout.router, prefix="/checkout", tags=["checkout"])
storefront_router.include_router(
    search.router, prefix="/search", tags=["search"])
