from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request

from app.schemas.shipping import Address, ShippingDetails, ShippingMethod
from app.services.shipping_service import ShippingService, shipping_service

router = APIRouter(prefix="/shipping", tags=["shipping"])

# Dependency to get the shipping service (singleton or DI in real app)


def get_shipping_service():
    return shipping_service


@router.post("/quote", response_model=Dict[str, Any])
def get_shipping_quote(
    provider: str,
    address: Address,
    method: ShippingMethod,
    request: Request,
    shipping_service: ShippingService = Depends(get_shipping_service),
):
    try:
        quote = shipping_service.get_quote(provider, address.dict(), method.value)
        return quote
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create", response_model=Dict[str, Any])
def create_shipment(
    provider: str,
    order_id: str,
    shipping_details: ShippingDetails,
    request: Request,
    shipping_service: ShippingService = Depends(get_shipping_service),
):
    try:
        result = shipping_service.create_shipment(provider, order_id, shipping_details)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/providers", response_model=Dict[str, Any])
def get_providers(shipping_service=Depends(get_shipping_service)):
    return {"providers": list(shipping_service.plugins.keys())}
