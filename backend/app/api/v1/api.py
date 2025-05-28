from fastapi import APIRouter

from app.api.v1.endpoints import dashboard, products, orders, conversation, ai_config
from app.api.v1.endpoints import batch_operations, products_keyset
from app.api.v1.endpoints import activities
from app.api.v1.endpoints import websocket
from app.api.v1.endpoints import storefront as storefront_content
from app.api.v1.endpoints import storefront_catalog
from app.api.v1.endpoints.violation import router as violation_router
from app.api.v1.endpoints.behavior import router as behavior_router
from app.api.v1.endpoints.content_moderation import router as content_moderation_router
from app.api.v1.endpoints.complaint import router as complaint_router
from app.api.routers.storefront import router as storefront_router

api_router = APIRouter()

api_router.include_router(dashboard.router, tags=["dashboard"])
api_router.include_router(products.router, tags=["products"])
api_router.include_router(products_keyset.router, tags=["products"])
api_router.include_router(batch_operations.router, tags=["batch-operations"])
api_router.include_router(orders.router, tags=["orders"])
api_router.include_router(conversation.router, tags=["conversations"])
api_router.include_router(ai_config.router, tags=["ai-config"])
api_router.include_router(activities.router, tags=[
                          "monitoring"], prefix="/admin")
api_router.include_router(websocket.router, tags=["websocket"])
api_router.include_router(violation_router, tags=["violations"])
api_router.include_router(behavior_router, tags=[
                          "behavior"], prefix="/behavior")
api_router.include_router(content_moderation_router, tags=[
                          "content-moderation"], prefix="/content")
api_router.include_router(complaint_router, tags=["complaints"])
api_router.include_router(storefront_router, tags=["storefront"], prefix="/storefront")
api_router.include_router(storefront_content.router, tags=["storefront-content"], prefix="/storefront-content")
api_router.include_router(storefront_catalog.router, tags=["storefront-catalog"], prefix="/storefront-catalog")
