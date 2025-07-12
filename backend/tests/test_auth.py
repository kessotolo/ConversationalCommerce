from datetime import datetime, timedelta, timezone
import jwt
import pytest
import os
from fastapi.testclient import TestClient
from backend.app.main import create_app

# Import the consistent UUID from conftest
from tests.conftest import TEST_USER_ID

# Ensure we're in test mode
os.environ["TESTING"] = "1"


@pytest.fixture
def unauth_client():
    """Create a test client without any auth dependency overrides"""
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


# Mock Clerk JWT token


def create_mock_token():
    # Import the test settings to access the SECRET_KEY
    from backend.app.core.config.test_settings import get_test_settings

    test_settings = get_test_settings()

    payload = {
        "sub": str(TEST_USER_ID),  # Use the UUID but convert to string for JWT
        "email": "test@example.com",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    # Use the same secret key as configured in the test settings
    return jwt.encode(payload, test_settings.SECRET_KEY, algorithm="HS256")


def test_dashboard_without_token(unauth_client):
    """Test dashboard access without authentication"""
    response = unauth_client.get("/api/v1/dashboard")
    assert response.status_code == 401
    assert "Missing or invalid Authorization header" in response.json()["detail"]


def test_dashboard_with_token(client, auth_headers):
    """Test dashboard access with authentication"""
    # Use the predefined auth_headers from the fixture
    response = client.get("/api/v1/dashboard", headers=auth_headers)
    assert response.status_code == 200
    assert "Welcome to your dashboard" in response.json()["message"]


def test_products_without_token(unauth_client):
    """Test that products endpoint requires authentication"""
    response = unauth_client.get("/api/v1/products")
    assert response.status_code == 401


def test_create_product_with_token(client, auth_headers, test_user):
    """Test creating a product with authentication"""
    # Use the predefined auth_headers from the fixture
    product_data = {
        "name": "Test Auth Product",
        "description": "Test Description",
        "price": 99.99,
    }
    response = client.post("/api/v1/products", headers=auth_headers, json=product_data)

    # Print response info for debugging
    print(f"Status: {response.status_code}\nResponse: {response.text}")

    # Check if we have a successful response (either 200 or 201)
    assert response.status_code in [
        200,
        201,
    ], f"Expected 200 or 201, got {response.status_code}: {response.text}"

    # Verify the product was created with the correct seller ID
    data = response.json()
    # Use the known TEST_USER_ID as a string directly
    assert data["seller_id"] == str(TEST_USER_ID)


def test_orders_without_token(unauth_client):
    """Test that orders endpoint requires authentication"""
    response = unauth_client.get("/api/v1/orders")
    assert response.status_code == 401


def test_orders_with_token(client, auth_headers):
    """Test orders access with authentication"""
    # Use the predefined auth_headers from the fixture
    response = client.get("/api/v1/orders", headers=auth_headers)
    assert response.status_code == 200
    assert "Orders retrieved successfully" in response.json()["message"]
