from enum import Enum
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field


class ShippingMethod(str, Enum):
    RIDER = "rider"
    COURIER = "courier"
    PICKUP = "pickup"
    BODA = "boda"
    BUS_PARCEL = "bus_parcel"
    IN_PERSON = "in_person"
    OTHER = "other"  # For plugin/custom methods


class Address(BaseModel):
    street: str
    city: str
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "Kenya"
    apartment: Optional[str] = None
    landmark: Optional[str] = None
    coordinates: Optional[Dict[str, float]] = None  # {latitude, longitude}


class ShippingPluginMeta(BaseModel):
    provider: str  # e.g. "Sendy", "DHL", "CustomPluginName"
    plugin_data: Dict[str, Any] = Field(default_factory=dict)


class ShippingDetails(BaseModel):
    address: Address
    method: Literal[
        "rider", "courier", "pickup", "boda", "bus_parcel", "in_person", "other"
    ]
    plugin_meta: Optional[ShippingPluginMeta] = None
    tracking_number: Optional[str] = None
    estimated_delivery: Optional[str] = None  # ISO date string
    shipping_cost: float
    currency: str = "KES"
    notes: Optional[str] = None
