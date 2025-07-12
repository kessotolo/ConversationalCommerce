import logging
import requests
from typing import Any, Dict, Optional

from backend.app.core.config.settings import get_settings
from backend.app.schemas.shipping import ShippingDetails
from backend.app.services.shipping_service import ShippingProviderPlugin

logger = logging.getLogger(__name__)
settings = get_settings()


class SendyShippingPlugin(ShippingProviderPlugin):
    """
    Sendy shipping provider implementation for East Africa deliveries.

    API Documentation: https://docs.sendyit.com/
    """

    def __init__(self):
        self.api_key = settings.SENDY_API_KEY
        self.api_username = settings.SENDY_API_USERNAME
        self.base_url = settings.SENDY_API_URL
        self.vendor_type = settings.SENDY_VENDOR_TYPE
        self.logger = logging.getLogger(__name__)

    def _make_request(self, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Make authenticated request to Sendy API."""
        url = f"{self.base_url}/{endpoint}"
        headers = {
            "Content-Type": "application/json",
            "X-SENDYAPIKEY": self.api_key,
            "X-SENDYAPIUSERNAME": self.api_username,
        }

        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Sendy API error: {str(e)}")
            # Return error response that follows our expected format
            return {
                "error": True,
                "message": str(e),
                "status": "failed",
            }

    def get_quote(self, address: dict, method: str, **kwargs) -> Dict[str, Any]:
        """
        Return a shipping quote from Sendy for the given address and method.

        Args:
            address: Dictionary containing destination details
            method: Shipping method (express, economy)
            **kwargs: Additional parameters like weight, dimensions
        """
        payload = {
            "command": "request_delivery_quote",
            "data": {
                "pickup_latitude": kwargs.get("pickup_latitude", "-1.300577"),
                "pickup_longitude": kwargs.get("pickup_longitude", "36.776010"),
                "delivery_latitude": address.get("latitude", "-1.319680"),
                "delivery_longitude": address.get("longitude", "36.838228"),
                "weight": kwargs.get("weight", 5),  # kg
                "vendor_type": self.vendor_type,
                "package_size": [
                    kwargs.get("length", 10),
                    kwargs.get("width", 10),
                    kwargs.get("height", 10)
                ]
            }
        }

        response = self._make_request("request", payload)

        # Transform response to our standard format
        if response.get("error", True):
            return {
                "error": True,
                "message": response.get("message", "Failed to get shipping quote"),
                "provider": "Sendy",
                "method": method
            }

        # Format successful response
        return {
            "cost": response.get("data", {}).get("amount", 0),
            "currency": response.get("data", {}).get("currency", "KES"),
            "provider": "Sendy",
            "method": method,
            "delivery_time": response.get("data", {}).get("eta", ""),
            "distance": response.get("data", {}).get("distance", 0)
        }

    def create_shipment(self, order_id: str, shipping_details: ShippingDetails, **kwargs) -> Dict[str, Any]:
        """
        Create a shipment with Sendy and return tracking info.

        Args:
            order_id: Unique order identifier
            shipping_details: Shipping details object
            **kwargs: Additional parameters like notes, item description
        """
        address = shipping_details.address.dict() if shipping_details.address else {}

        payload = {
            "command": "request_delivery",
            "data": {
                "from": {
                    "from_name": kwargs.get("from_name", "Store Warehouse"),
                    "from_lat": kwargs.get("from_lat", "-1.300577"),
                    "from_long": kwargs.get("from_long", "36.776010"),
                    "from_description": kwargs.get("from_description", "Store Location"),
                    "from_contact_name": kwargs.get("contact_name", "Warehouse Manager"),
                    "from_contact_phone": kwargs.get("contact_phone", "+254700000000"),
                },
                "to": {
                    "to_name": shipping_details.recipient_name,
                    "to_lat": address.get("latitude", "-1.319680"),
                    "to_long": address.get("longitude", "36.838228"),
                    "to_description": address.get("street", "") + ", " + address.get("city", ""),
                    "to_contact_name": shipping_details.recipient_name,
                    "to_contact_phone": shipping_details.recipient_phone or "+254700000000",
                },
                "package_size": [
                    kwargs.get("length", 10),
                    kwargs.get("width", 10),
                    kwargs.get("height", 10)
                ],
                "weight": kwargs.get("weight", 5),  # kg
                "package_description": kwargs.get("description", f"Order #{order_id}"),
                "order_id": order_id,
                "vendor_type": self.vendor_type,
                "payment_method": "prepaid"  # or "cash"
            }
        }

        response = self._make_request("request", payload)

        # Transform response to our standard format
        if response.get("error", True):
            return {
                "error": True,
                "message": response.get("message", "Failed to create shipment"),
                "provider": "Sendy"
            }

        # Format successful response
        return {
            "tracking_number": response.get("data", {}).get("order_no", f"SENDY-{order_id}"),
            "provider": "Sendy",
            "status": "created",
            "estimated_delivery": response.get("data", {}).get("eta", ""),
            "tracking_url": response.get("data", {}).get("tracking_link", "")
        }

    def track_shipment(self, tracking_number: str, **kwargs) -> Dict[str, Any]:
        """
        Track a shipment by tracking number.

        Args:
            tracking_number: The Sendy tracking number (order_no)
            **kwargs: Additional parameters
        """
        payload = {
            "command": "track_order",
            "data": {
                "order_no": tracking_number,
                "vendor_type": self.vendor_type
            }
        }

        response = self._make_request("track", payload)

        # Transform response to our standard format
        if response.get("error", True):
            return {
                "error": True,
                "message": response.get("message", "Failed to track shipment"),
                "provider": "Sendy",
                "tracking_number": tracking_number
            }

        # Map Sendy status to our standardized status
        status_map = {
            "pending": "pending",
            "assigned": "assigned",
            "picked": "picked_up",
            "on_transit": "in_transit",
            "delivered": "delivered",
            "cancelled": "canceled"
        }

        sendy_status = response.get("data", {}).get("status", "")

        # Format successful response
        return {
            "status": status_map.get(sendy_status, "unknown"),
            "tracking_number": tracking_number,
            "provider": "Sendy",
            "location": response.get("data", {}).get("current_location", ""),
            "timestamp": response.get("data", {}).get("timestamp", ""),
            "notes": response.get("data", {}).get("notes", ""),
            "tracking_url": response.get("data", {}).get("tracking_link", "")
        }
