import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
from decimal import Decimal

from app.models.order import Order, OrderStatus, OrderSource
from app.models.product import Product
from tests.conftest import TEST_USER_ID


@pytest.fixture
def whatsapp_product(db_session, test_user):
    """Create a test product for WhatsApp order testing"""
    product = Product(
        name="WhatsApp Test Product",
        description="WhatsApp Test Description",
        price=Decimal("49.99"),
        seller_id=test_user.id,
        show_on_whatsapp=True
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def test_create_whatsapp_order_success(client, auth_headers, db_session, whatsapp_product):
    """Test creating a WhatsApp order with all required fields"""
    # Create WhatsApp order data
    order_data = {
        "product_id": str(whatsapp_product.id),
        "buyer_name": "WhatsApp Buyer",
        "buyer_phone": "+1987654321",
        "quantity": 2,
        "total_amount": 99.98,
        "whatsapp_number": "+1987654321",
        "message_id": "test_message_id",
        "conversation_id": "test_conversation_id"
    }
    
    # Submit the WhatsApp order
    response = client.post("/api/v1/orders/whatsapp", headers=auth_headers, json=order_data)
    
    # Check response
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["buyer_name"] == order_data["buyer_name"]
    assert data["quantity"] == order_data["quantity"]
    assert data["order_source"] == "whatsapp"
    assert data["whatsapp_number"] == order_data["whatsapp_number"]
    
    # Verify in database
    order_id = UUID(data["id"])
    db_order = db_session.query(Order).filter(Order.id == order_id).first()
    assert db_order is not None
    assert db_order.order_source == OrderSource.whatsapp
    assert db_order.message_id == order_data["message_id"]


def test_create_whatsapp_order_missing_whatsapp_fields(client, auth_headers, whatsapp_product):
    """Test creating a WhatsApp order without required WhatsApp-specific fields"""
    # Missing whatsapp_number
    order_data = {
        "product_id": str(whatsapp_product.id),
        "buyer_name": "WhatsApp Buyer",
        "buyer_phone": "+1987654321",
        "quantity": 1,
        "total_amount": 49.99,
        "message_id": "test_message_id",
        # Missing whatsapp_number
    }
    
    response = client.post("/api/v1/orders/whatsapp", headers=auth_headers, json=order_data)
    assert response.status_code == 422
    
    # Missing message_id
    order_data = {
        "product_id": str(whatsapp_product.id),
        "buyer_name": "WhatsApp Buyer",
        "buyer_phone": "+1987654321",
        "quantity": 1,
        "total_amount": 49.99,
        "whatsapp_number": "+1987654321",
        # Missing message_id
    }
    
    response = client.post("/api/v1/orders/whatsapp", headers=auth_headers, json=order_data)
    assert response.status_code == 422


def test_create_whatsapp_order_invalid_phone(client, auth_headers, whatsapp_product):
    """Test creating a WhatsApp order with invalid phone number format"""
    order_data = {
        "product_id": str(whatsapp_product.id),
        "buyer_name": "WhatsApp Buyer",
        "buyer_phone": "invalid-phone",  # Invalid format
        "quantity": 1,
        "total_amount": 49.99,
        "whatsapp_number": "invalid-whatsapp",  # Invalid format
        "message_id": "test_message_id",
        "conversation_id": "test_conversation_id"
    }
    
    response = client.post("/api/v1/orders/whatsapp", headers=auth_headers, json=order_data)
    assert response.status_code == 422


def test_get_whatsapp_orders_by_number(client, auth_headers, db_session, test_user):
    """Test getting orders for a specific WhatsApp number"""
    # Create test product
    product = Product(
        name="WhatsApp Product",
        description="Test Description",
        price=Decimal("25.00"),
        seller_id=test_user.id,
        show_on_whatsapp=True
    )
    db_session.add(product)
    db_session.commit()
    
    # Create multiple WhatsApp orders with the same number
    whatsapp_number = "+9876543210"
    orders = []
    for i in range(3):
        order = Order(
            product_id=product.id,
            seller_id=test_user.id,
            buyer_name=f"WhatsApp Buyer {i}",
            buyer_phone=whatsapp_number,
            quantity=1,
            total_amount=25.00,
            status=OrderStatus.pending,
            order_source=OrderSource.whatsapp,
            whatsapp_number=whatsapp_number,
            message_id=f"message_id_{i}",
            conversation_id=f"conversation_id_{i}"
        )
        orders.append(order)
    
    db_session.add_all(orders)
    db_session.commit()
    
    # Get orders for the WhatsApp number
    response = client.get(f"/api/v1/orders/whatsapp/{whatsapp_number}", headers=auth_headers)
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 3
    
    # Check correct WhatsApp number
    for item in data["items"]:
        assert item["whatsapp_number"] == whatsapp_number


def test_get_whatsapp_orders_with_filters(client, auth_headers, db_session, test_user):
    """Test getting WhatsApp orders with status filters"""
    # Create test product
    product = Product(
        name="Filter Test Product",
        description="Test Description",
        price=Decimal("25.00"),
        seller_id=test_user.id,
        show_on_whatsapp=True
    )
    db_session.add(product)
    db_session.commit()
    
    # Create WhatsApp orders with different statuses
    whatsapp_number = "+5551234567"
    pending_order = Order(
        product_id=product.id,
        seller_id=test_user.id,
        buyer_name="Pending Order",
        buyer_phone=whatsapp_number,
        quantity=1,
        total_amount=25.00,
        status=OrderStatus.pending,
        order_source=OrderSource.whatsapp,
        whatsapp_number=whatsapp_number,
        message_id="pending_message_id",
        conversation_id="pending_conversation_id"
    )
    
    confirmed_order = Order(
        product_id=product.id,
        seller_id=test_user.id,
        buyer_name="Confirmed Order",
        buyer_phone=whatsapp_number,
        quantity=1,
        total_amount=25.00,
        status=OrderStatus.confirmed,
        order_source=OrderSource.whatsapp,
        whatsapp_number=whatsapp_number,
        message_id="confirmed_message_id",
        conversation_id="confirmed_conversation_id"
    )
    
    db_session.add_all([pending_order, confirmed_order])
    db_session.commit()
    
    # Get only confirmed orders
    response = client.get(
        f"/api/v1/orders/whatsapp/{whatsapp_number}?status=confirmed", 
        headers=auth_headers
    )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "confirmed"
    
    # Get only pending orders
    response = client.get(
        f"/api/v1/orders/whatsapp/{whatsapp_number}?status=pending", 
        headers=auth_headers
    )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "pending"


def test_get_whatsapp_orders_invalid_number(client, auth_headers):
    """Test getting orders with an invalid WhatsApp number format"""
    response = client.get("/api/v1/orders/whatsapp/invalid-number", headers=auth_headers)
    assert response.status_code == 422


def test_get_whatsapp_orders_nonexistent_number(client, auth_headers):
    """Test getting orders with a nonexistent WhatsApp number (should return empty list)"""
    response = client.get("/api/v1/orders/whatsapp/+1234567890", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert len(data["items"]) == 0
