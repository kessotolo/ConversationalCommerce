# This file makes the api directory a Python package

from fastapi import APIRouter

from app.api.routers import tenant

api_router = APIRouter()
api_router.include_router(tenant.router, prefix="/tenants", tags=["tenants"])
