import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4, UUID
from decimal import Decimal

from app.models.order import Order, OrderStatus, OrderSource
from app.models.product import Product
from tests.conftest import TEST_USER_ID


@pytest.fixture
def test_product(db_session, test_user):
    """Create a test product for order testing"""
    product = Product(
        name="Test Product",
        description="Test Description",
        price=Decimal("99.99"),
        seller_id=test_user.id
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def test_create_order_minimum_fields(client, auth_headers, db_session, test_product):
    """Test creating a new order with minimum required fields"""
    # Create order data with only required fields
    order_data = {
        "product_id": str(test_product.id),
        "buyer_name": "Test Buyer",
        "buyer_phone": "+1234567890",
        "quantity": 1,
        "total_amount": 99.99,
        "order_source": "website",
        "buyer_email": "test@example.com"
    }

    # Submit the order
    response = client.post(
        "/api/v1/orders", headers=auth_headers, json=order_data)

    # Check response
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["buyer_name"] == order_data["buyer_name"]
    assert data["buyer_phone"] == order_data["buyer_phone"]
    assert data["quantity"] == order_data["quantity"]
    assert float(data["total_amount"]) == order_data["total_amount"]
    assert data["status"] == "pending"


def test_create_order_all_fields(client, auth_headers, db_session, test_product):
    """Test creating a new order with all fields populated"""
    # Create order data with all possible fields
    order_data = {
        "product_id": str(test_product.id),
        "buyer_name": "Complete Buyer",
        "buyer_phone": "+1234567890",
        "buyer_email": "buyer@example.com",
        "buyer_address": "123 Test St, Test City, Test Country",
        "quantity": 2,
        "total_amount": 199.98,
        "notes": "Please deliver quickly",
        "order_source": "website",
        "buyer_email": "test@example.com"
    }

    # Submit the order
    response = client.post(
        "/api/v1/orders", headers=auth_headers, json=order_data)

    # Check response
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()

    # Verify all fields were saved correctly
    assert data["buyer_name"] == order_data["buyer_name"]
    assert data["buyer_phone"] == order_data["buyer_phone"]
    assert data["buyer_email"] == order_data["buyer_email"]
    assert data["buyer_address"] == order_data["buyer_address"]
    assert data["quantity"] == order_data["quantity"]
    assert float(data["total_amount"]) == order_data["total_amount"]
    assert data["notes"] == order_data["notes"]
    assert data["order_source"] == order_data["order_source"]
    assert data["status"] == "pending"

    # Verify in database
    order_id = UUID(data["id"])
    db_order = db_session.query(Order).filter(Order.id == order_id).first()
    assert db_order is not None
    assert db_order.buyer_email == order_data["buyer_email"]
    assert db_order.notes == order_data["notes"]


def test_create_order_different_sources(client, auth_headers, db_session, test_product):
    """Test creating orders from different sources (website, instagram)"""
    # Test Instagram source
    instagram_order = {
        "product_id": str(test_product.id),
        "buyer_name": "Instagram User",
        "buyer_phone": "+1234567890",
        "quantity": 1,
        "total_amount": 99.99,
        "order_source": "instagram"
    }

    response = client.post(
        "/api/v1/orders", headers=auth_headers, json=instagram_order)
    assert response.status_code == 201
    data = response.json()
    assert data["order_source"] == "instagram"

    # Verify in database
    order_id = UUID(data["id"])
    db_order = db_session.query(Order).filter(Order.id == order_id).first()
    assert db_order is not None
    assert db_order.order_source == OrderSource.instagram


def test_create_order_missing_required_fields(client, auth_headers, test_product):
    """Test creating an order with missing required fields"""
    # Missing buyer_name
    order_data = {
        "product_id": str(test_product.id),
        "buyer_phone": "+1234567890",
        "quantity": 1,
        "total_amount": 99.99,
        "order_source": "website",
        "buyer_email": "test@example.com"
    }

    response = client.post(
        "/api/v1/orders", headers=auth_headers, json=order_data)
    assert response.status_code == 422

    # Missing product_id
    order_data = {
        "buyer_name": "Test Buyer",
        "buyer_phone": "+1234567890",
        "quantity": 1,
        "total_amount": 99.99,
        "order_source": "website",
        "buyer_email": "test@example.com"
    }

    response = client.post(
        "/api/v1/orders", headers=auth_headers, json=order_data)
    assert response.status_code == 422


def test_create_order_invalid_product_id(client, auth_headers):
    """Test creating an order with invalid product_id"""
    # Non-existent product ID
    order_data = {
        "product_id": str(uuid4()),  # Random UUID that doesn't exist
        "buyer_name": "Test Buyer",
        "buyer_phone": "+1234567890",
        "quantity": 1,
        "total_amount": 99.99,
        "order_source": "website",
        "buyer_email": "test@example.com"
    }

    response = client.post(
        "/api/v1/orders", headers=auth_headers, json=order_data)
    assert response.status_code == 404
    assert "Product not found" in response.json().get("detail", "")

    # Invalid UUID format
    order_data["product_id"] = "not-a-uuid"
    response = client.post(
        "/api/v1/orders", headers=auth_headers, json=order_data)
    assert response.status_code == 422


def test_create_order_invalid_data_types(client, auth_headers, test_product):
    """Test creating an order with invalid data types"""
    # String for quantity (should be integer)
    order_data = {
        "product_id": str(test_product.id),
        "buyer_name": "Test Buyer",
        "buyer_phone": "+1234567890",
        "quantity": "one",  # Invalid: should be an integer
        "total_amount": 99.99,
        "order_source": "website",
        "buyer_email": "test@example.com"
    }

    response = client.post(
        "/api/v1/orders", headers=auth_headers, json=order_data)
    assert response.status_code == 422

    # Negative quantity
    order_data["quantity"] = -1
    response = client.post(
        "/api/v1/orders", headers=auth_headers, json=order_data)
    assert response.status_code == 422

    # Negative amount
    order_data = {
        "product_id": str(test_product.id),
        "buyer_name": "Test Buyer",
        "buyer_phone": "+1234567890",
        "quantity": 1,
        "total_amount": -10.50,  # Invalid: should be positive
        "order_source": "website",
        "buyer_email": "test@example.com"
    }

    response = client.post(
        "/api/v1/orders", headers=auth_headers, json=order_data)
    assert response.status_code == 422


def test_create_website_order_without_email(client, auth_headers, test_product):
    """Test creating a website order without email (should fail validation)"""
    # Website orders require email
    order_data = {
        "product_id": str(test_product.id),
        "buyer_name": "Test Buyer",
        "buyer_phone": "+1234567890",
        "quantity": 1,
        "total_amount": 99.99,
        "order_source": "website",
        "buyer_email": "test@example.com"
        # No email provided
    }

    response = client.post(
        "/api/v1/orders", headers=auth_headers, json=order_data)
    assert response.status_code == 422
    assert "Email is required for website orders" in response.json().get("detail", "")


def test_create_order_unauthorized(client, test_product):
    """Test creating an order without authentication"""
    order_data = {
        "product_id": str(test_product.id),
        "buyer_name": "Test Buyer",
        "buyer_phone": "+1234567890",
        "quantity": 1,
        "total_amount": 99.99,
        "order_source": "website",
        "buyer_email": "test@example.com"
    }

    # Submit without auth headers
    response = client.post("/api/v1/orders", json=order_data)
    assert response.status_code == 401 or response.status_code == 403
