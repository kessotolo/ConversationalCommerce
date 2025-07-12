import logging
from typing import Dict, List, Optional, Any
import uuid
import asyncio
from datetime import datetime

from backend.app.services.shipping.providers.base_provider import (
    ShippingRateRequest,
    ShippingRateResponse,
    ShippingRate,
    Address,
    PackageDimensions
)
from backend.app.services.shipping.shipping_provider_registry import shipping_provider_registry
from backend.app.models.shipping import SellerShippingProvider
from backend.app.db.session import get_db


class ShippingRateService:
    """
    Service for calculating shipping rates across multiple providers
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    async def get_rates_from_provider(
        self, 
        provider_id: str,
        request: ShippingRateRequest,
        config: Optional[Dict[str, Any]] = None
    ) -> ShippingRateResponse:
        """
        Get shipping rates from a specific provider
        
        Args:
            provider_id: The shipping provider ID
            request: Shipping rate request
            config: Optional provider configuration
            
        Returns:
            ShippingRateResponse with rates from the provider
        """
        try:
            provider = shipping_provider_registry.get_provider(provider_id, config)
            return await provider.get_rates(request)
        except Exception as e:
            self.logger.error(f"Error getting rates from provider {provider_id}: {str(e)}")
            return ShippingRateResponse(
                rates=[],
                carrier=provider_id,
                errors=[f"Failed to get rates: {str(e)}"]
            )
    
    async def get_rates_from_multiple_providers(
        self,
        provider_ids: List[str],
        request: ShippingRateRequest
    ) -> Dict[str, ShippingRateResponse]:
        """
        Get shipping rates from multiple providers in parallel
        
        Args:
            provider_ids: List of shipping provider IDs
            request: Shipping rate request
            
        Returns:
            Dictionary mapping provider IDs to their rate responses
        """
        tasks = []
        for provider_id in provider_ids:
            task = self.get_rates_from_provider(provider_id, request)
            tasks.append(task)
            
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        responses = {}
        for i, provider_id in enumerate(provider_ids):
            result = results[i]
            if isinstance(result, Exception):
                responses[provider_id] = ShippingRateResponse(
                    rates=[],
                    carrier=provider_id,
                    errors=[f"Failed to get rates: {str(result)}"]
                )
            else:
                responses[provider_id] = result
                
        return responses
    
    async def get_seller_shipping_rates(
        self,
        tenant_id: uuid.UUID,
        origin_postal_code: str,
        destination_postal_code: str,
        package_weight: float
    ) -> List[ShippingRate]:
        """
        Get rates from seller-defined shipping providers
        
        Args:
            tenant_id: Tenant ID for the seller
            origin_postal_code: Origin postal code
            destination_postal_code: Destination postal code
            package_weight: Package weight in kg
            
        Returns:
            List of shipping rates from seller-defined providers
        """
        try:
            # Get seller shipping providers from the database
            async with get_db() as db:
                query = (
                    "SELECT * FROM seller_shipping_providers "
                    "WHERE tenant_id = :tenant_id AND is_active = TRUE"
                )
                result = await db.execute(query, {"tenant_id": tenant_id})
                providers = [dict(row) for row in result.mappings()]
                
            if not providers:
                return []
                
            rates = []
            for provider in providers:
                # Calculate rate based on provider's pricing structure
                base_fee = provider.get("base_fee", 0)
                per_km_fee = provider.get("per_km_fee", 0)
                
                # Simple distance calculation based on postal codes
                # In a real implementation, we would use a geocoding service
                distance_km = 10  # Placeholder
                
                # Calculate total rate
                total_rate = base_fee + (per_km_fee * distance_km)
                
                # Add weight surcharge if applicable
                if package_weight > 5:
                    weight_surcharge = (package_weight - 5) * 100  # $1 per kg over 5kg
                    total_rate += weight_surcharge
                
                # Create a shipping rate object
                rate = ShippingRate(
                    service={"code": f"LOCAL_{provider['provider_type']}", 
                             "name": provider["name"],
                             "carrier": "LOCAL"},
                    base_rate=base_fee / 100,  # Convert cents to dollars
                    fees={"distance": (per_km_fee * distance_km) / 100},
                    total_rate=total_rate / 100,  # Convert cents to dollars
                    currency="USD",
                    transit_days=1
                )
                
                rates.append(rate)
                
            return rates
        except Exception as e:
            self.logger.error(f"Error calculating seller shipping rates: {str(e)}")
            return []
    
    async def get_all_available_rates(
        self,
        tenant_id: uuid.UUID,
        request: ShippingRateRequest,
        carrier_preferences: Optional[List[str]] = None
    ) -> List[ShippingRate]:
        """
        Get all available shipping rates (from carriers and seller providers)
        
        Args:
            tenant_id: Tenant ID for the seller
            request: Shipping rate request
            carrier_preferences: Optional list of preferred carriers
            
        Returns:
            Sorted list of all available shipping rates
        """
        all_rates = []
        
        # Get rates from external carriers
        provider_ids = carrier_preferences or ["usps"]
        carrier_responses = await self.get_rates_from_multiple_providers(provider_ids, request)
        
        for provider_id, response in carrier_responses.items():
            if response.rates:
                all_rates.extend(response.rates)
        
        # Get seller-defined shipping rates
        if request.origin and request.destination and request.packages:
            origin_postal = request.origin.postal_code
            dest_postal = request.destination.postal_code
            package_weight = request.packages[0].weight if request.packages else 1.0
            
            seller_rates = await self.get_seller_shipping_rates(
                tenant_id,
                origin_postal,
                dest_postal,
                package_weight
            )
            
            all_rates.extend(seller_rates)
        
        # Sort by price
        all_rates.sort(key=lambda r: r.total_rate)
        
        return all_rates
    
    async def save_rate_quote(
        self,
        tenant_id: uuid.UUID,
        rate: ShippingRate,
        order_id: Optional[uuid.UUID] = None
    ) -> str:
        """
        Save a selected rate quote for future use
        
        Args:
            tenant_id: Tenant ID 
            rate: The selected shipping rate
            order_id: Optional order ID to associate with the quote
            
        Returns:
            Quote ID for the saved rate
        """
        try:
            quote_id = str(uuid.uuid4())
            
            # In a real implementation, we would save to the database
            # For now, we'll just log it
            self.logger.info(
                f"Saved rate quote {quote_id} for tenant {tenant_id}: "
                f"{rate.service.name} - {rate.total_rate}"
            )
            
            return quote_id
        except Exception as e:
            self.logger.error(f"Error saving rate quote: {str(e)}")
            raise


# Global singleton instance
shipping_rate_service = ShippingRateService()
