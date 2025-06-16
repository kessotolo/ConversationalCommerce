from typing import Any, Dict, Optional

from backend.app.schemas.shipping import ShippingDetails


class ShippingProviderPlugin:
    def get_quote(self, address: dict, method: str, **kwargs) -> Dict[str, Any]:
        """Return a shipping quote for the given address and method."""
        raise NotImplementedError

    def create_shipment(
        self, order_id: str, shipping_details: ShippingDetails, **kwargs
    ) -> Dict[str, Any]:
        """Create a shipment with the provider and return tracking info."""
        raise NotImplementedError

    def track_shipment(self, tracking_number: str, **kwargs) -> Dict[str, Any]:
        """Track a shipment by tracking number."""
        raise NotImplementedError


class ShippingService:
    def __init__(self):
        self.plugins = {}

    def register_plugin(self, name: str, plugin: ShippingProviderPlugin):
        self.plugins[name] = plugin

    def get_plugin(self, name: str) -> Optional[ShippingProviderPlugin]:
        return self.plugins.get(name)

    def get_quote(
        self, provider: str, address: dict, method: str, **kwargs
    ) -> Dict[str, Any]:
        plugin = self.get_plugin(provider)
        if not plugin:
            raise ValueError(f"Shipping provider plugin '{provider}' not found")
        return plugin.get_quote(address, method, **kwargs)

    def create_shipment(
        self, provider: str, order_id: str, shipping_details: ShippingDetails, **kwargs
    ) -> Dict[str, Any]:
        plugin = self.get_plugin(provider)
        if not plugin:
            raise ValueError(f"Shipping provider plugin '{provider}' not found")
        return plugin.create_shipment(order_id, shipping_details, **kwargs)

    def track_shipment(
        self, provider: str, tracking_number: str, **kwargs
    ) -> Dict[str, Any]:
        plugin = self.get_plugin(provider)
        if not plugin:
            raise ValueError(f"Shipping provider plugin '{provider}' not found")
        return plugin.track_shipment(tracking_number, **kwargs)


class MockShippingPlugin(ShippingProviderPlugin):
    def get_quote(self, address, method, **kwargs):
        return {
            "cost": 500,
            "currency": "KES",
            "provider": "MockShipping",
            "method": method,
        }

    def create_shipment(self, order_id, shipping_details, **kwargs):
        return {
            "tracking_number": f"MOCK{order_id[-6:]}",
            "provider": "MockShipping",
            "status": "created",
        }

    def track_shipment(self, tracking_number, **kwargs):
        return {"status": "in_transit", "tracking_number": tracking_number}


# Singleton shipping service instance
shipping_service = ShippingService()
shipping_service.register_plugin("mock", MockShippingPlugin())
