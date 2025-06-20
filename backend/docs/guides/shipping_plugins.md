# Shipping Provider Plugin Guide

This guide explains how to build, register, and use shipping provider plugins in the Conversational Commerce platform.

## Overview

Shipping plugins allow you to integrate third-party or custom shipping providers (e.g., Sendy, DHL, local couriers) into the order and checkout flow. Plugins can provide shipping quotes, create shipments, and track deliveries.

## Plugin Interface

Implement the `ShippingProviderPlugin` interface in `backend/app/services/shipping_service.py`:

```python
class ShippingProviderPlugin:
    def get_quote(self, address: dict, method: str, **kwargs) -> dict:
        """Return a shipping quote for the given address and method."""
        raise NotImplementedError

    def create_shipment(self, order_id: str, shipping_details: ShippingDetails, **kwargs) -> dict:
        """Create a shipment and return tracking info."""
        raise NotImplementedError

    def track_shipment(self, tracking_number: str, **kwargs) -> dict:
        """Track a shipment by tracking number."""
        raise NotImplementedError
```

## Example Plugin

```python
from backend.app.services.shipping_service import ShippingProviderPlugin
from backend.app.schemas.shipping import ShippingDetails

class MockShippingPlugin(ShippingProviderPlugin):
    def get_quote(self, address, method, **kwargs):
        return {"cost": 500, "currency": "KES", "provider": "MockShipping"}

    def create_shipment(self, order_id, shipping_details, **kwargs):
        return {"tracking_number": "MOCK123456", "provider": "MockShipping"}

    def track_shipment(self, tracking_number, **kwargs):
        return {"status": "in_transit", "tracking_number": tracking_number}
```

## Registering a Plugin

Register your plugin with the `ShippingService`:

```python
from backend.app.services.shipping_service import ShippingService

shipping_service = ShippingService()
shipping_service.register_plugin("mock", MockShippingPlugin())
```

## Using Plugins via API

- **Get Quote:** `POST /api/v1/shipping/quote` with `provider`, `address`, and `method`.
- **Create Shipment:** `POST /api/v1/shipping/create` with `provider`, `order_id`, and `shipping_details`.

## Plugin Meta in Orders

When using a plugin, set the `pluginMeta` field in `ShippingDetails` (frontend/backend) to include the provider name and any custom data.

---

For more details, see the code in `backend/app/services/shipping_service.py` and the shipping schemas.
