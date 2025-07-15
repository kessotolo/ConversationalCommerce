"""
Storefront API module for customer-facing endpoints.

This module provides the API structure for merchant storefronts
following the pattern: {merchant-id}.enwhe.io

All endpoints are scoped to specific merchants and optimized
for customer browsing and shopping experience.
"""

from fastapi import APIRouter

from app.api.v1.storefront.endpoints import (
    products,
)

# Main storefront API router for customer-facing endpoints
storefront_router = APIRouter(prefix="/storefront", tags=["storefront"])

# Include all storefront routers
storefront_router.include_router(
    products.router, prefix="/products", tags=["products"])
