import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

from app.services.order_service import OrderNotFoundError


def test_get_buyer_orders(client, auth_headers):
    """Test getting buyer orders with authentication."""
    resp = client.get("/api/v1/buyer/orders?limit=2&offset=0",
                      headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "orders" in data
    assert isinstance(data["orders"], list)


def test_get_buyer_orders_no_auth(client):
    """Test getting buyer orders without authentication."""
    resp = client.get("/api/v1/buyer/orders", headers=auth_headers)
    assert resp.status_code == 401
