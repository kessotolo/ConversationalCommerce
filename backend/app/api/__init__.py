# This file makes the api directory a Python package

from fastapi import APIRouter

from app.app.api.routers import tenant, admin_router

api_router = APIRouter()
api_router.include_router(tenant.router, prefix="/tenants", tags=["tenants"])
api_router.include_router(admin_router, tags=["admin"])
