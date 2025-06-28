import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

from app.services.order_service import OrderNotFoundError


@pytest.mark.asyncio
async def test_list_buyer_orders(client: AsyncClient, auth_headers):
    sample_orders = [{"id": "1"}, {"id": "2"}]
    async_mock = AsyncMock(return_value=(sample_orders, 2))
    with patch("app.services.order_service.OrderService.get_orders_for_buyer", async_mock):
        resp = await client.get("/api/v1/buyer/orders?limit=2&offset=0", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert data["items"] == sample_orders
    async_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_buyer_cross_tenant_forbidden(client: AsyncClient, auth_headers):
    async_mock = AsyncMock(side_effect=OrderNotFoundError("not found"))
    with patch("app.services.order_service.OrderService.get_orders_for_buyer", async_mock):
        resp = await client.get("/api/v1/buyer/orders", headers=auth_headers)
    assert resp.status_code in (403, 404)
    async_mock.assert_awaited_once()

