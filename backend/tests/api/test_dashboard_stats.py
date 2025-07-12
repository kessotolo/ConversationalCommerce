import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4

from backend.app.models.order import Order
from backend.app.models.user import User
from backend.app.schemas.dashboard import DashboardStatsResponse


def test_dashboard_stats_authenticated(client, auth_headers):
    """Test dashboard stats endpoint with valid authentication."""
    response = client.get("/api/v1/dashboard/stats", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert "total_orders" in data
    assert "total_revenue" in data
    assert "recent_orders" in data
    assert isinstance(data["total_orders"], int)
    assert isinstance(data["total_revenue"], (int, float))


def test_dashboard_stats_unauthenticated(client):
    """Test dashboard stats endpoint without authentication."""
    response = client.get("/api/v1/dashboard/stats")

    assert response.status_code == 401


def test_dashboard_stats_with_date_range(client, auth_headers):
    """Test dashboard stats with date range parameters."""
    from datetime import datetime, timedelta

    # Test with date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)

    params = {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat()
    }

    response = client.get("/api/v1/dashboard/stats",
                          headers=auth_headers, params=params)

    assert response.status_code == 200
    data = response.json()
    assert "total_orders" in data
    assert "total_revenue" in data


def test_dashboard_stats_with_invalid_date_range(client, auth_headers):
    """Test dashboard stats with invalid date range."""
    params = {
        "start_date": "invalid-date",
        "end_date": "invalid-date"
    }

    response = client.get("/api/v1/dashboard/stats",
                          headers=auth_headers, params=params)

    # Should handle invalid dates gracefully
    assert response.status_code in [200, 400]


def test_dashboard_stats_with_tenant_filter(client, auth_headers):
    """Test dashboard stats with tenant filtering."""
    # Test with tenant_id parameter
    params = {"tenant_id": "test-tenant-id"}

    response = client.get("/api/v1/dashboard/stats",
                          headers=auth_headers, params=params)

    assert response.status_code == 200
    data = response.json()
    assert "total_orders" in data


def test_dashboard_stats_multiple_tenants(client, auth_headers, auth_headers2):
    """Test dashboard stats across multiple tenants."""
    # Get stats for first tenant
    response1 = client.get("/api/v1/dashboard/stats", headers=auth_headers)
    assert response1.status_code == 200
    data1 = response1.json()

    # Get stats for second tenant
    response2 = client.get("/api/v1/dashboard/stats", headers=auth_headers2)
    assert response2.status_code == 200
    data2 = response2.json()

    # Stats should be different for different tenants
    assert data1 != data2
