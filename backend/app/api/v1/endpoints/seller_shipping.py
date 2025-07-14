import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_tenant, get_db
from app.models.tenant import Tenant
from app.repositories.seller_shipping_repository import SellerShippingRepository
from app.schemas.seller_shipping import (
    SellerShippingProviderCreate,
    SellerShippingProviderUpdate,
    SellerShippingProviderResponse,
    SimpleProviderResponse,
    ShippingCourierCreate,
    ShippingCourierUpdate,
    ShippingCourierResponse,
    DeliveryQuoteRequest,
    DeliveryQuoteResponse,
)
from app.services.shipping.seller_plugin import calculate_delivery_fee, estimate_delivery_time

router = APIRouter()


@router.post("/providers", response_model=SellerShippingProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_shipping_provider(
    provider: SellerShippingProviderCreate,
    db: AsyncSession = Depends(get_db),
    current_tenant: Tenant = Depends(get_current_active_tenant),
):
    """
    Create a new shipping provider for the current tenant.
    This allows sellers to define their own delivery services.
    """
    shipping_repo = SellerShippingRepository(db)
    db_provider = await shipping_repo.create_provider(
        tenant_id=current_tenant.id,
        provider_data=provider.dict(),
    )
    await db.commit()
    return db_provider


@router.get("/providers", response_model=List[SimpleProviderResponse])
async def list_shipping_providers(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_tenant: Tenant = Depends(get_current_active_tenant),
):
    """
    List all shipping providers for the current tenant.
    Returns a simplified view suitable for dropdowns and lists.
    """
    shipping_repo = SellerShippingRepository(db)
    providers = await shipping_repo.list_providers(
        tenant_id=current_tenant.id,
        skip=skip,
        limit=limit,
    )
    return providers


@router.get("/providers/{provider_id}", response_model=SellerShippingProviderResponse)
async def get_shipping_provider(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_tenant: Tenant = Depends(get_current_active_tenant),
):
    """
    Get details of a specific shipping provider.
    """
    shipping_repo = SellerShippingRepository(db)
    provider = await shipping_repo.get_provider(provider_id, current_tenant.id)
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipping provider not found",
        )
    return provider


@router.put("/providers/{provider_id}", response_model=SellerShippingProviderResponse)
async def update_shipping_provider(
    provider_id: uuid.UUID,
    provider: SellerShippingProviderUpdate,
    db: AsyncSession = Depends(get_db),
    current_tenant: Tenant = Depends(get_current_active_tenant),
):
    """
    Update a shipping provider's details.
    """
    shipping_repo = SellerShippingRepository(db)
    existing_provider = await shipping_repo.get_provider(provider_id, current_tenant.id)
    if not existing_provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipping provider not found",
        )
    
    update_data = {k: v for k, v in provider.dict().items() if v is not None}
    db_provider = await shipping_repo.update_provider(
        provider_id=provider_id,
        tenant_id=current_tenant.id,
        provider_data=update_data,
    )
    await db.commit()
    return db_provider


@router.delete("/providers/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shipping_provider(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_tenant: Tenant = Depends(get_current_active_tenant),
):
    """
    Delete a shipping provider.
    """
    shipping_repo = SellerShippingRepository(db)
    deleted = await shipping_repo.delete_provider(provider_id, current_tenant.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipping provider not found",
        )
    await db.commit()
    return None


@router.put("/providers/{provider_id}/make-default", response_model=SellerShippingProviderResponse)
async def set_default_provider(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_tenant: Tenant = Depends(get_current_active_tenant),
):
    """
    Set a provider as the default shipping provider for the tenant.
    """
    shipping_repo = SellerShippingRepository(db)
    provider = await shipping_repo.get_provider(provider_id, current_tenant.id)
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipping provider not found",
        )
    
    if not provider.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot set inactive provider as default",
        )
    
    await shipping_repo.set_default_provider(provider_id, current_tenant.id)
    await db.commit()
    
    # Get the updated provider
    updated_provider = await shipping_repo.get_provider(provider_id, current_tenant.id)
    return updated_provider


@router.get("/providers/default", response_model=Optional[SellerShippingProviderResponse])
async def get_default_provider(
    db: AsyncSession = Depends(get_db),
    current_tenant: Tenant = Depends(get_current_active_tenant),
):
    """
    Get the default shipping provider for the current tenant.
    """
    shipping_repo = SellerShippingRepository(db)
    provider = await shipping_repo.get_default_provider(current_tenant.id)
    return provider


@router.post("/providers/{provider_id}/couriers", response_model=ShippingCourierResponse, status_code=status.HTTP_201_CREATED)
async def create_shipping_courier(
    provider_id: uuid.UUID,
    courier: ShippingCourierCreate,
    db: AsyncSession = Depends(get_db),
    current_tenant: Tenant = Depends(get_current_active_tenant),
):
    """
    Create a new courier for a shipping provider.
    """
    shipping_repo = SellerShippingRepository(db)
    
    # Verify provider exists
    provider = await shipping_repo.get_provider(provider_id, current_tenant.id)
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipping provider not found",
        )
    
    db_courier = await shipping_repo.create_courier(
        tenant_id=current_tenant.id,
        provider_id=provider_id,
        courier_data={k: v for k, v in courier.dict().items() if k != 'provider_id'},
    )
    await db.commit()
    return db_courier


@router.get("/providers/{provider_id}/couriers", response_model=List[ShippingCourierResponse])
async def list_shipping_couriers(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_tenant: Tenant = Depends(get_current_active_tenant),
):
    """
    List all couriers for a specific provider.
    """
    shipping_repo = SellerShippingRepository(db)
    
    # Verify provider exists
    provider = await shipping_repo.get_provider(provider_id, current_tenant.id)
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipping provider not found",
        )
    
    couriers = await shipping_repo.list_couriers(
        tenant_id=current_tenant.id,
        provider_id=provider_id,
    )
    return couriers


@router.get("/couriers/{courier_id}", response_model=ShippingCourierResponse)
async def get_courier(
    courier_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_tenant: Tenant = Depends(get_current_active_tenant),
):
    """
    Get details of a specific courier.
    """
    shipping_repo = SellerShippingRepository(db)
    courier = await shipping_repo.get_courier(courier_id, current_tenant.id)
    if not courier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Courier not found",
        )
    return courier


@router.put("/couriers/{courier_id}", response_model=ShippingCourierResponse)
async def update_courier(
    courier_id: uuid.UUID,
    courier: ShippingCourierUpdate,
    db: AsyncSession = Depends(get_db),
    current_tenant: Tenant = Depends(get_current_active_tenant),
):
    """
    Update a courier's details.
    """
    shipping_repo = SellerShippingRepository(db)
    existing_courier = await shipping_repo.get_courier(courier_id, current_tenant.id)
    if not existing_courier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Courier not found",
        )
    
    update_data = {k: v for k, v in courier.dict().items() if v is not None}
    db_courier = await shipping_repo.update_courier(
        courier_id=courier_id,
        tenant_id=current_tenant.id,
        courier_data=update_data,
    )
    await db.commit()
    return db_courier


@router.delete("/couriers/{courier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_courier(
    courier_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_tenant: Tenant = Depends(get_current_active_tenant),
):
    """
    Delete a courier.
    """
    shipping_repo = SellerShippingRepository(db)
    deleted = await shipping_repo.delete_courier(courier_id, current_tenant.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Courier not found",
        )
    await db.commit()
    return None


@router.post("/quote", response_model=DeliveryQuoteResponse)
async def get_delivery_quote(
    request: DeliveryQuoteRequest,
    db: AsyncSession = Depends(get_db),
    current_tenant: Tenant = Depends(get_current_active_tenant),
):
    """
    Get a delivery quote for a specific provider.
    Calculates fee based on distance and provider's fee structure.
    """
    shipping_repo = SellerShippingRepository(db)
    provider = await shipping_repo.get_provider(request.provider_id, current_tenant.id)
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipping provider not found",
        )
    
    # Calculate distance if not provided
    distance_km = request.distance_km
    if not distance_km:
        distance_km = calculate_distance(
            request.pickup_lat, 
            request.pickup_lng,
            request.delivery_lat, 
            request.delivery_lng
        )
    
    # Check if delivery is within provider's range
    if distance_km < provider.min_distance or distance_km > provider.max_distance:
        return DeliveryQuoteResponse(
            provider_id=str(provider.id),
            provider_name=provider.name,
            fee=0,
            currency="KES",  # Could be made dynamic based on tenant settings
            estimated_delivery_time="N/A",
            distance_km=distance_km,
            available=False,
            error_message=f"Delivery distance {distance_km:.1f}km is outside provider's range ({provider.min_distance}-{provider.max_distance}km)"
        )
    
    # Calculate fee
    fee = calculate_delivery_fee(provider, distance_km, request.item_weight)
    
    # Estimate delivery time
    delivery_time = provider.estimated_delivery_time or estimate_delivery_time(provider.provider_type, distance_km)
    
    return DeliveryQuoteResponse(
        provider_id=str(provider.id),
        provider_name=provider.name,
        fee=fee,
        currency="KES",  # Could be made dynamic based on tenant settings
        estimated_delivery_time=delivery_time,
        distance_km=distance_km,
        available=True
    )


# Utility functions

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate distance between two points in kilometers using the Haversine formula.
    """
    from math import radians, sin, cos, sqrt, atan2
    
    # Radius of earth in km
    R = 6371
    
    # Convert degrees to radians
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    
    # Haversine formula
    dlng = lng2 - lng1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    distance = R * c
    
    return distance
