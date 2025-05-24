from fastapi import APIRouter
from app.api.v1.endpoints import dashboard, products, orders
from app.api.v1.endpoints import conversation, ai_config

api_router = APIRouter()

api_router.include_router(dashboard.router, tags=["dashboard"])
api_router.include_router(products.router, tags=["products"])
api_router.include_router(orders.router, tags=["orders"])
api_router.include_router(conversation.router, tags=["conversations"])
api_router.include_router(ai_config.router, tags=["ai-config"])
