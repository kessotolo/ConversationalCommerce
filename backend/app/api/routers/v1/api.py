from backend.app.api.v1.endpoints import customer

api_router.include_router(
    customer.router, prefix="/customers", tags=["customers"])
