from fastapi import APIRouter

# ai_config router removed - using v1 endpoints instead
from app.app.api.routers.conversation import router as conversation_router
from app.app.api.routers.storefront import router as storefront_router
from app.app.api.v1.endpoints import (
    activities,
    batch_operations,
    dashboard,
    orders,
    buyer_orders,
    products,
    products_keyset,
)
from app.app.api.v1.endpoints import storefront as storefront_content
from app.app.api.v1.endpoints import storefront_catalog, websocket
from app.app.api.v1.endpoints.behavior import router as behavior_router
from app.app.api.v1.endpoints.complaint import router as complaint_router
from app.app.api.v1.endpoints.content_moderation import router as content_moderation_router
from app.app.api.v1.endpoints.domain_verification import router as domain_verification_router
from app.app.api.v1.endpoints.theme_builder import router as theme_builder_router
from app.app.api.v1.endpoints.violation import router as violation_router
from app.app.api.v1.endpoints.whatsapp import router as whatsapp_router
from app.app.api.v1.endpoints.users import router as users_router
from app.app.api.routers.tenant import router as tenant_router

# New multi-tenant admin and storefront routers
from app.app.api.v1.admin import admin_router
from app.app.api.v1.storefront import storefront_router as new_storefront_router

api_router = APIRouter()

# Legacy endpoints (maintaining backward compatibility)
api_router.include_router(dashboard.router, tags=["dashboard"])
api_router.include_router(products.router, tags=["products"])
api_router.include_router(products_keyset.router, tags=["products"])
api_router.include_router(batch_operations.router, tags=["batch-operations"])
api_router.include_router(orders.router, tags=["orders"])
api_router.include_router(
    buyer_orders.router,
    prefix="/buyer/orders",
    tags=["buyer-orders"],
)
api_router.include_router(conversation_router, tags=["conversations"])
# ai_config router removed - using v1 endpoints instead
api_router.include_router(activities.router, tags=[
                          "monitoring"], prefix="/admin")
api_router.include_router(websocket.router, tags=["websocket"])
api_router.include_router(violation_router, tags=["violations"])
api_router.include_router(behavior_router, tags=[
                          "behavior"], prefix="/behavior")
api_router.include_router(
    content_moderation_router, tags=["content-moderation"], prefix="/content"
)
api_router.include_router(complaint_router, tags=["complaints"])
api_router.include_router(storefront_router, tags=[
                          "storefront"], prefix="/storefront")
api_router.include_router(
    storefront_content.router, tags=["storefront-content"], prefix="/storefront-content"
)
api_router.include_router(
    storefront_catalog.router, tags=["storefront-catalog"], prefix="/storefront-catalog"
)
api_router.include_router(whatsapp_router, tags=[
                          "whatsapp"], prefix="/whatsapp")
api_router.include_router(domain_verification_router, tags=[
                          "domain-verification"], prefix="/domain")
api_router.include_router(tenant_router, prefix="/tenants", tags=["tenants"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(theme_builder_router, tags=[
                          "theme-builder"], prefix="/theme-builder")

# New multi-tenant admin and storefront endpoints
# These follow the new URL patterns:
# Admin: admin.enwhe.io/store/{merchant-id}/api/v1/admin/*
# Storefront: {merchant-id}.enwhe.io/api/v1/storefront/*
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(new_storefront_router,
                          prefix="/storefront", tags=["storefront"])
