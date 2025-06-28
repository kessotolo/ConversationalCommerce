import uuid
import logging
from typing import Dict, Any, Optional, List

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.shipping import SellerShippingProvider, ShippingCourier
from backend.app.schemas.shipping import ShippingDetails
from backend.app.services.shipping_service import ShippingProviderPlugin

logger = logging.getLogger(__name__)


def calculate_delivery_fee(provider: SellerShippingProvider, distance_km: float, weight_kg: Optional[float] = None) -> int:
    """Calculate delivery fee based on provider's pricing and delivery distance"""
    # Base fee
    fee = provider.base_fee

    # Add per-km fee
    if provider.per_km_fee > 0:
        km_fee = provider.per_km_fee * distance_km
        fee += int(km_fee)

    # Weight surcharge (if provider has weight-based pricing)
    if weight_kg and hasattr(provider, 'weight_surcharge') and provider.weight_surcharge:
        # Example: 50 cents per kg over 5kg
        if weight_kg > 5:
            extra_weight = weight_kg - 5
            weight_fee = int(extra_weight * 50)  # 50 cents per extra kg
            fee += weight_fee

    return fee


def estimate_delivery_time(provider_type: str, distance_km: float) -> str:
    """Provide an estimated delivery time based on provider type and distance"""
    if provider_type == "bike":
        # Bikes average 15km/h in urban areas
        hours = distance_km / 15
        minutes = int(hours * 60)
        if minutes < 15:
            return "15 minutes"
        elif minutes < 30:
            return "30 minutes"
        elif minutes < 60:
            return f"{minutes} minutes"
        else:
            return f"{int(hours)} hour{'s' if hours >= 2 else ''}"

    elif provider_type == "motorcycle":
        # Motorcycles average 25km/h in urban areas
        hours = distance_km / 25
        minutes = int(hours * 60)
        if minutes < 10:
            return "10 minutes"
        elif minutes < 30:
            return f"{minutes} minutes"
        else:
            return f"{int(hours)} hour{'s' if hours >= 2 else ''}"

    elif provider_type == "car":
        # Cars average 20km/h in urban areas
        hours = distance_km / 20
        minutes = int(hours * 60)
        if minutes < 20:
            return "20 minutes"
        elif minutes < 60:
            return f"{minutes} minutes"
        else:
            return f"{int(hours)} hour{'s' if hours >= 2 else ''}"

    else:
        # Default for other provider types
        if distance_km < 3:
            return "30-45 minutes"
        elif distance_km < 7:
            return "45-60 minutes"
        else:
            return "1-2 hours"


def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points using Haversine formula"""
    from math import radians, sin, cos, sqrt, atan2

    # Radius of the Earth in km
    R = 6371.0

    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])

    dlng = lng2 - lng1
    dlat = lat2 - lat1

    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))

    distance = R * c
    return distance


def is_within_coverage_area(provider: SellerShippingProvider, lat: float, lng: float) -> bool:
    """Check if a location is within the provider's coverage area"""
    if not provider.coverage_area:
        return True  # No coverage area set means no restrictions

    coverage = provider.coverage_area

    # Handle circular coverage area
    if coverage.get('type') == 'circle':
        center_lat = coverage.get('center_lat')
        center_lng = coverage.get('center_lng')
        radius_km = coverage.get('radius_km')

        if not all([center_lat, center_lng, radius_km]):
            return True  # Malformed coverage area

        distance = calculate_distance(center_lat, center_lng, lat, lng)
        return distance <= radius_km

    # Handle polygon coverage area (simplified check for now)
    elif coverage.get('type') == 'polygon':
        # For now, just a simple bounding box check
        coords = coverage.get('coordinates', [])
        if not coords:
            return True

        lats = [point[0] for point in coords]
        lngs = [point[1] for point in coords]

        min_lat, max_lat = min(lats), max(lats)
        min_lng, max_lng = min(lngs), max(lngs)

        return min_lat <= lat <= max_lat and min_lng <= lng <= max_lng

    return True  # Unknown coverage area type


class SellerDefinedShippingPlugin(ShippingProviderPlugin):
    """Plugin that handles shipping through seller-defined providers"""

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def get_provider(self, provider_id: uuid.UUID) -> Optional[SellerShippingProvider]:
        """Get a specific shipping provider"""
        stmt = select(SellerShippingProvider).where(
            and_(
                SellerShippingProvider.id == provider_id,
                SellerShippingProvider.is_active == True
            )
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def get_tenant_providers(self, tenant_id: uuid.UUID) -> List[SellerShippingProvider]:
        """Get all providers for a tenant"""
        stmt = select(SellerShippingProvider).where(
            and_(
                SellerShippingProvider.tenant_id == tenant_id,
                SellerShippingProvider.is_active == True
            )
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().all()

    async def get_available_couriers(self, provider_id: uuid.UUID) -> List[ShippingCourier]:
        """Get available couriers for a provider"""
        stmt = select(ShippingCourier).where(
            and_(
                ShippingCourier.provider_id == provider_id,
                ShippingCourier.is_active == True,
                ShippingCourier.available == True
            )
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().all()

    async def get_quote(self, address: Dict[str, Any], method: str, **kwargs) -> Dict[str, Any]:
        """
        Get a shipping quote from a seller-defined provider.

        Args:
            address: Delivery address information
            method: Shipping method (e.g., 'bike', 'pickup')
            **kwargs:
                provider_id: ID of the shipping provider
                pickup_lat: Pickup latitude
                pickup_lng: Pickup longitude
                weight_kg: Weight in kg (optional)

        Returns:
            Dict with quote information
        """
        provider_id = kwargs.get("provider_id")
        if not provider_id:
            return {"error": True, "message": "Provider ID is required"}

        try:
            provider_id = uuid.UUID(provider_id)
            provider = await self.get_provider(provider_id)

            if not provider:
                return {"error": True, "message": "Provider not found or inactive"}

            # Get coordinates for distance calculation
            pickup_lat = kwargs.get("pickup_lat")
            pickup_lng = kwargs.get("pickup_lng")
            delivery_lat = float(address.get("latitude", 0))
            delivery_lng = float(address.get("longitude", 0))

            if not all([pickup_lat, pickup_lng, delivery_lat, delivery_lng]):
                return {"error": True, "message": "Coordinates are required for delivery quote"}

            # Check if delivery location is within coverage area
            if not is_within_coverage_area(provider, delivery_lat, delivery_lng):
                return {
                    "error": True,
                    "message": "Delivery location is outside provider's coverage area",
                    "provider": provider.name,
                    "method": method
                }

            # Calculate distance
            distance_km = calculate_distance(
                float(pickup_lat),
                float(pickup_lng),
                delivery_lat,
                delivery_lng
            )

            # Check distance limits
            if distance_km < provider.min_distance or distance_km > provider.max_distance:
                return {
                    "error": True,
                    "message": f"Distance {distance_km:.1f}km is outside provider's range ({provider.min_distance}-{provider.max_distance}km)",
                    "provider": provider.name,
                    "method": method,
                    "distance": distance_km
                }

            # Calculate cost based on provider's fee structure
            weight_kg = kwargs.get("weight_kg")
            cost = calculate_delivery_fee(provider, distance_km, weight_kg)

            # Generate delivery time estimate
            delivery_time = provider.estimated_delivery_time or estimate_delivery_time(
                provider.provider_type, distance_km
            )

            return {
                "cost": cost,
                # FUTURE: Make this dynamic based on tenant settings. See issue #127.
                "currency": "KES",
                "provider": provider.name,
                "method": method or provider.provider_type,
                "delivery_time": delivery_time,
                "distance": distance_km
            }

        except Exception as e:
            logger.error(f"Error generating delivery quote: {e}")
            return {"error": True, "message": str(e), "provider": "seller"}

    async def create_shipment(self, order_id: str, shipping_details: ShippingDetails, **kwargs) -> Dict[str, Any]:
        """
        Create a shipment with a seller-defined provider.

        Args:
            order_id: Order identifier
            shipping_details: Shipping details
            **kwargs:
                provider_id: ID of the provider
                pickup_lat: Pickup latitude
                pickup_lng: Pickup longitude
                courier_id: ID of the courier (optional)

        Returns:
            Dict with shipment information
        """
        provider_id = kwargs.get("provider_id")
        if not provider_id:
            return {"error": True, "message": "Provider ID is required"}

        try:
            provider_id = uuid.UUID(provider_id)
            provider = await self.get_provider(provider_id)

            if not provider:
                return {"error": True, "message": "Provider not found or inactive"}

            # Generate a simple tracking number
            import random
            import string
            tracking_number = f"SELF-{order_id[:8]}"

            # For now, we'll just create a basic tracking record
            # In a real implementation, this would integrate with a delivery management system
            # or send notifications to couriers via WhatsApp/SMS

            # Try to assign an available courier if needed
            courier_id = kwargs.get("courier_id")
            courier = None

            if not courier_id:
                # Auto-assign a courier
                available_couriers = await self.get_available_couriers(provider_id)
                if available_couriers:
                    # Simple assignment algorithm
                    courier = available_couriers[0]
                    courier_id = courier.id

            # Here we would normally:
            # 1. Send WhatsApp notifications to the courier
            # 2. Update courier availability
            # 3. Store shipment details

            return {
                "tracking_number": tracking_number,
                "provider": provider.name,
                "status": "created",
                "courier_id": str(courier_id) if courier_id else None,
                "courier_name": courier.name if courier else None,
                "courier_phone": courier.phone if courier else None,
                "estimated_delivery": provider.estimated_delivery_time or "1-2 hours"
            }

        except Exception as e:
            logger.error(f"Error creating shipment: {e}")
            return {"error": True, "message": str(e), "provider": "seller"}

    def track_shipment(self, tracking_number: str, **kwargs) -> Dict[str, Any]:
        """
        Track a shipment (simplified implementation).

        In a real implementation, this would check the status in a delivery database
        or fetch updates from a WhatsApp/SMS reporting system.
        """
        # Currently returns a simplified response since we don't have a tracking system
        # This would be connected to WhatsApp/SMS reporting in production

        # Simple status determination based on tracking number
        import time
        import random

        # Get timestamp from tracking number if possible
        try:
            order_id = tracking_number.split('-')[1]
            timestamp_seed = sum(ord(c) for c in order_id)
            random.seed(timestamp_seed)

            # Generate a deterministic but seemingly random status based on order ID
            statuses = ["pending", "picked_up", "in_transit", "delivered"]
            weights = [0.1, 0.3, 0.4, 0.2]  # Probability distribution
            status = random.choices(statuses, weights=weights, k=1)[0]

            return {
                "tracking_number": tracking_number,
                "status": status,
                "provider": "Seller Delivery",
                "location": "Local area",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "notes": "Contact seller for detailed status updates"
            }
        except Exception as e:
            logger.error(f"Error tracking shipment: {e}")
            return {
                "tracking_number": tracking_number,
                "status": "unknown",
                "provider": "Seller Delivery",
                "notes": "Unable to retrieve tracking information"
            }
