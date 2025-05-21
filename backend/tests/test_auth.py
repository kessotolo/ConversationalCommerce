import pytest
from fastapi.testclient import TestClient
from app.main import app
import jwt
from datetime import datetime, timedelta

client = TestClient(app)

# Mock Clerk JWT token


def create_mock_token():
    payload = {
        "sub": "test_user_123",
        "email": "test@example.com",
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    # Note: In real tests, you'd use a proper signing key
    return jwt.encode(payload, "test_secret", algorithm="HS256")


def test_dashboard_without_token():
    response = client.get("/api/v1/dashboard")
    assert response.status_code == 401
    assert "Missing or invalid Authorization header" in response.json()[
        "detail"]


def test_dashboard_with_token():
    token = create_mock_token()
    response = client.get(
        "/api/v1/dashboard",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert "Welcome to your dashboard" in response.json()["message"]


def test_products_without_token():
    response = client.get("/api/v1/products")
    assert response.status_code == 401


def test_create_product_with_token():
    token = create_mock_token()
    product_data = {
        "name": "Test Product",
        "description": "Test Description",
        "price": 99.99
    }
    response = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {token}"},
        json=product_data
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Product created successfully"


def test_orders_without_token():
    response = client.get("/api/v1/orders")
    assert response.status_code == 401


def test_orders_with_token():
    token = create_mock_token()
    response = client.get(
        "/api/v1/orders",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert "Orders retrieved successfully" in response.json()["message"]
