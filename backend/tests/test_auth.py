from datetime import datetime, timedelta, timezone
import jwt
from app.main import app
from fastapi.testclient import TestClient
import pytest
import os
os.environ["TESTING"] = "1"

client = TestClient(app)

# Mock Clerk JWT token


def create_mock_token():
    payload = {
        "sub": "test_user_123",
        "email": "test@example.com",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
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
    print(response.status_code, response.text)
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
    print(response.status_code, response.text)
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
    print(response.status_code, response.text)
    assert response.status_code == 200
    assert "Orders retrieved successfully" in response.json()["message"]
