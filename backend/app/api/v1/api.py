from fastapi import APIRouter
from app.api.v1.endpoints import dashboard, products, orders

api_router = APIRouter()

api_router.include_router(dashboard.router, tags=["dashboard"])
api_router.include_router(products.router, tags=["products"])
api_router.include_router(orders.router, tags=["orders"])
