import logging
from typing import Any, Dict, Optional

from app.core.config.settings import get_settings
from app.schemas.shipping import ShippingDetails

# Initialize logger
logger = logging.getLogger(__name__)
settings = get_settings()


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
            raise ValueError(
                f"Shipping provider plugin '{provider}' not found")
        return plugin.get_quote(address, method, **kwargs)

    def create_shipment(
        self, provider: str, order_id: str, shipping_details: ShippingDetails, **kwargs
    ) -> Dict[str, Any]:
        plugin = self.get_plugin(provider)
        if not plugin:
            raise ValueError(
                f"Shipping provider plugin '{provider}' not found")
        return plugin.create_shipment(order_id, shipping_details, **kwargs)

    def track_shipment(
        self, provider: str, tracking_number: str, **kwargs
    ) -> Dict[str, Any]:
        plugin = self.get_plugin(provider)
        if not plugin:
            raise ValueError(
                f"Shipping provider plugin '{provider}' not found")
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


# Import the Sendy plugin conditionally to handle potential import errors
try:
    from backend.app.services.shipping.sendy_plugin import SendyShippingPlugin
    has_sendy_plugin = True
except ImportError:
    logger.warning(
        "SendyShippingPlugin could not be imported. Using MockShippingPlugin as fallback.")
    has_sendy_plugin = False

# Singleton shipping service instance
shipping_service = ShippingService()

# Always register the mock plugin for development/testing
shipping_service.register_plugin("mock", MockShippingPlugin())

# Register Sendy plugin if credentials are configured
if has_sendy_plugin and settings.SENDY_API_KEY and settings.SENDY_API_USERNAME:
    try:
        sendy_plugin = SendyShippingPlugin()
        shipping_service.register_plugin("sendy", sendy_plugin)
        logger.info("Sendy shipping provider registered successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Sendy plugin: {e}")
else:
    logger.warning(
        "Sendy shipping provider not registered. Check API credentials.")

# Set default provider if specified in settings
DEFAULT_SHIPPING_PROVIDER = getattr(
    settings, "DEFAULT_SHIPPING_PROVIDER", "mock")
if DEFAULT_SHIPPING_PROVIDER not in shipping_service.plugins:
    logger.warning(
        f"Default shipping provider '{DEFAULT_SHIPPING_PROVIDER}' not registered. "
        f"Falling back to 'mock'."
    )
    DEFAULT_SHIPPING_PROVIDER = "mock"
