from datetime import datetime
from typing import Dict, Any, Optional, List

from pydantic import BaseModel, ConfigDict, Field, validator

# Base schemas for seller shipping providers

class SellerShippingProviderBase(BaseModel):
    """Base schema for seller-defined shipping providers"""
    name: str
    provider_type: str = Field(..., description="Type of provider: 'bike', 'pickup', 'local', 'personal'")
    description: Optional[str] = None
    
    # Pricing structure
    base_fee: int = Field(..., description="Base delivery fee in smallest currency unit (e.g., cents)")
    per_km_fee: int = Field(0, description="Additional fee per kilometer in smallest currency unit")
    min_distance: float = Field(0, description="Minimum delivery distance in km")
    max_distance: float = Field(10, description="Maximum delivery distance in km")
    
    # Coverage area
    coverage_area: Optional[Dict[str, Any]] = Field(None, description="GeoJSON coverage area")
    
    # Contact information
    contact_name: str
    contact_phone: str
    contact_whatsapp: Optional[str] = None
    
    # Delivery options
    estimated_delivery_time: Optional[str] = None
    delivery_days: Optional[Dict[str, bool]] = None
    delivery_hours: Optional[Dict[str, str]] = None
    
    # Status
    is_active: bool = True
    is_default: bool = False


class SellerShippingProviderCreate(SellerShippingProviderBase):
    """Schema for creating a new shipping provider"""
    pass


class SellerShippingProviderUpdate(BaseModel):
    """Schema for updating an existing shipping provider"""
    name: Optional[str] = None
    provider_type: Optional[str] = None
    description: Optional[str] = None
    base_fee: Optional[int] = None
    per_km_fee: Optional[int] = None
    min_distance: Optional[float] = None
    max_distance: Optional[float] = None
    coverage_area: Optional[Dict[str, Any]] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_whatsapp: Optional[str] = None
    estimated_delivery_time: Optional[str] = None
    delivery_days: Optional[Dict[str, bool]] = None
    delivery_hours: Optional[Dict[str, str]] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    onboarding_status: Optional[str] = None
    onboarding_completed: Optional[bool] = None


class SellerShippingProviderInDB(SellerShippingProviderBase):
    """Schema for a shipping provider as stored in the database"""
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    onboarding_status: str
    onboarding_completed: bool
    
    model_config = ConfigDict(from_attributes=True)


class SellerShippingProviderResponse(SellerShippingProviderInDB):
    """Schema for the API response"""
    pass


# Base schemas for shipping couriers

class ShippingCourierBase(BaseModel):
    """Base schema for shipping couriers"""
    name: str
    phone: str
    whatsapp: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_description: Optional[str] = None
    profile_photo_url: Optional[str] = None
    is_active: bool = True
    available: bool = True


class ShippingCourierCreate(ShippingCourierBase):
    """Schema for creating a new shipping courier"""
    provider_id: str


class ShippingCourierUpdate(BaseModel):
    """Schema for updating an existing shipping courier"""
    name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_description: Optional[str] = None
    profile_photo_url: Optional[str] = None
    is_active: Optional[bool] = None
    available: Optional[bool] = None
    onboarding_completed: Optional[bool] = None


class ShippingCourierInDB(ShippingCourierBase):
    """Schema for a shipping courier as stored in the database"""
    id: str
    provider_id: str
    tenant_id: str
    onboarding_completed: bool
    onboarding_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ShippingCourierResponse(ShippingCourierInDB):
    """Schema for the API response"""
    pass


# Helper schemas for shipping provider operations

class SimpleProviderResponse(BaseModel):
    """Simplified provider info for dropdowns and lists"""
    id: str
    name: str
    provider_type: str
    base_fee: int
    is_default: bool


class DeliveryZoneCircle(BaseModel):
    """Simple circle delivery zone for non-technical sellers"""
    center_lat: float
    center_lng: float
    radius_km: float = Field(..., description="Radius in kilometers")


class DeliveryQuoteRequest(BaseModel):
    """Request for a delivery quote from a seller provider"""
    provider_id: str
    pickup_lat: float
    pickup_lng: float
    delivery_lat: float
    delivery_lng: float
    distance_km: Optional[float] = None
    item_weight: Optional[float] = None
    
    
class DeliveryQuoteResponse(BaseModel):
    """Response with a delivery quote"""
    provider_id: str
    provider_name: str
    fee: int
    currency: str = "KES"
    estimated_delivery_time: str
    distance_km: float
    available: bool
    error_message: Optional[str] = None
