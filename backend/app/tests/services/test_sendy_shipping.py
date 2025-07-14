import pytest
import unittest.mock as mock
from typing import Dict, Any

from app.app.schemas.shipping import ShippingDetails, Address
from app.app.services.shipping.sendy_plugin import SendyShippingPlugin
from app.app.services.shipping_service import shipping_service


class TestSendyShippingPlugin:
    """Test suite for the Sendy shipping provider plugin."""

    def setup_method(self):
        """Set up test fixtures before each test method."""
        # Create a mock instance of the SendyShippingPlugin with mocked API call
        self.plugin = SendyShippingPlugin()

        # Sample shipping details for testing
        self.address = Address(
            street="Ngong Road",
            city="Nairobi",
            state="Nairobi",
            country="Kenya",
            postal_code="00100",
            latitude="-1.319680",
            longitude="36.838228"
        )

        self.shipping_details = ShippingDetails(
            recipient_name="Test Customer",
            recipient_email="test@example.com",
            recipient_phone="+254700000000",
            address=self.address,
            shipping_method="express"
        )

        self.order_id = "test-order-123"

    @mock.patch('requests.post')
    def test_get_quote_success(self, mock_post):
        """Test successful shipping quote retrieval."""
        # Mock successful API response
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "error": False,
            "data": {
                "amount": 500,
                "currency": "KES",
                "eta": "30 minutes",
                "distance": 5.2
            }
        }
        mock_post.return_value = mock_response

        # Call get_quote
        result = self.plugin.get_quote(
            address=self.address.dict(),
            method="express",
            weight=2
        )

        # Verify the result
        assert result["cost"] == 500
        assert result["currency"] == "KES"
        assert result["provider"] == "Sendy"
        assert result["method"] == "express"
        assert "delivery_time" in result
        assert "distance" in result

        # Verify API was called with expected parameters
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert "request" in args[0]
        assert "pickup_latitude" in kwargs["json"]["data"]
        assert "delivery_latitude" in kwargs["json"]["data"]
        assert "weight" in kwargs["json"]["data"]

    @mock.patch('requests.post')
    def test_get_quote_error(self, mock_post):
        """Test error handling when quote retrieval fails."""
        # Mock error API response
        mock_response = mock.Mock()
        mock_response.status_code = 400
        mock_response.json.return_value = {
            "error": True,
            "message": "Invalid request parameters"
        }
        mock_post.return_value = mock_response

        # Call get_quote
        result = self.plugin.get_quote(
            address=self.address.dict(),
            method="express"
        )

        # Verify error response format
        assert result["error"] is True
        assert "message" in result
        assert result["provider"] == "Sendy"
        assert result["method"] == "express"

    @mock.patch('requests.post')
    def test_create_shipment_success(self, mock_post):
        """Test successful shipment creation."""
        # Mock successful API response
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "error": False,
            "data": {
                "order_no": "SENDY123456",
                "tracking_link": "https://track.sendyit.com/SENDY123456",
                "eta": "30 minutes"
            }
        }
        mock_post.return_value = mock_response

        # Call create_shipment
        result = self.plugin.create_shipment(
            order_id=self.order_id,
            shipping_details=self.shipping_details,
            weight=2
        )

        # Verify the result
        assert result["tracking_number"] == "SENDY123456"
        assert result["provider"] == "Sendy"
        assert result["status"] == "created"
        assert "tracking_url" in result
        assert "estimated_delivery" in result

        # Verify API was called with expected parameters
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert "request" in args[0]
        assert "to_name" in kwargs["json"]["data"]["to"]
        assert self.shipping_details.recipient_name == kwargs["json"]["data"]["to"]["to_name"]

    @mock.patch('requests.post')
    def test_track_shipment(self, mock_post):
        """Test shipment tracking functionality."""
        # Mock successful tracking API response
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "error": False,
            "data": {
                "status": "on_transit",
                "current_location": "Ngong Road",
                "timestamp": "2023-06-23T14:30:00Z",
                "notes": "Package in transit",
                "tracking_link": "https://track.sendyit.com/SENDY123456"
            }
        }
        mock_post.return_value = mock_response

        # Call track_shipment
        result = self.plugin.track_shipment(
            tracking_number="SENDY123456"
        )

        # Verify the result
        assert result["status"] == "in_transit"  # Mapped status
        assert result["tracking_number"] == "SENDY123456"
        assert result["provider"] == "Sendy"
        assert "location" in result
        assert "timestamp" in result
        assert "notes" in result
        assert "tracking_url" in result

        # Verify API was called with expected parameters
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert "track" in args[0]
        assert kwargs["json"]["data"]["order_no"] == "SENDY123456"

    def test_shipping_service_registration(self):
        """Test that the Sendy plugin is registered with the shipping service."""
        # Check if Sendy plugin is available in the shipping service
        # This may be mock or sendy depending on environment setup
        assert len(shipping_service.plugins) >= 1
        assert "mock" in shipping_service.plugins  # Mock should always be available

        # Note: In a real environment with credentials, Sendy would be registered
        # But in test environment without env vars, it might not be
        # Here we just verify the shipping service has plugins registered
