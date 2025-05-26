import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import UUID
from decimal import Decimal
from datetime import datetime, timedelta
import json

from app.models.order import Order, OrderStatus, OrderSource
from app.models.product import Product
from tests.conftest import TEST_USER_ID


def test_create_order(client, auth_headers, db_session, test_user):
    """Test creating a new order"""
    # First create a test product
    product = Product(
        name="Test Product",
        description="Test Description",
        price=Decimal("99.99"),
        seller_id=test_user.id,
        is_featured=False,
        show_on_storefront=True
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    
    # Create order data
    order_data = {
        "product_id": str(product.id),
        "buyer_name": "Test Buyer",
        "buyer_phone": "+1234567890",
        "buyer_email": "buyer@example.com",
        "buyer_address": "123 Test St, Test City",
        "quantity": 1,
        "total_amount": 99.99,
        "notes": "Test order notes",
        "order_source": "website"
    }
    
    # Store the user ID as a string for comparison
    user_id_str = str(test_user.id)
    
    # Submit the order
    response = client.post("/api/v1/orders", headers=auth_headers, json=order_data)
    
    # Check response
    assert response.status_code == 201
    data = response.json()
    assert data["buyer_name"] == order_data["buyer_name"]
    assert data["buyer_phone"] == order_data["buyer_phone"]
    assert data["product_id"] == order_data["product_id"]
    assert float(data["total_amount"]) == order_data["total_amount"]
    assert data["seller_id"] == user_id_str
    assert data["status"] == "pending"
    
    # Verify in database
    order_id = UUID(data["id"])
    db_order = db_session.query(Order).filter(Order.id == order_id).first()
    assert db_order is not None
    assert db_order.buyer_name == order_data["buyer_name"]
    assert db_order.status == OrderStatus.pending


def test_create_whatsapp_order(client, auth_headers, db_session, test_user):
    """Test creating a WhatsApp order"""
    # First create a test product
    product = Product(
        name="WhatsApp Product",
        description="Test Description",
        price=Decimal("49.99"),
        seller_id=test_user.id,
        show_on_whatsapp=True
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    
    # Create WhatsApp order data
    order_data = {
        "product_id": str(product.id),
        "buyer_name": "WhatsApp Buyer",
        "buyer_phone": "+1987654321",
        "quantity": 2,
        "total_amount": 99.98,
        "whatsapp_number": "+1987654321",
        "message_id": "test_message_id",
        "conversation_id": "test_conversation_id"
    }
    
    # Store the user ID as a string for comparison
    user_id_str = str(test_user.id)
    
    # Submit the WhatsApp order
    response = client.post("/api/v1/orders/whatsapp", headers=auth_headers, json=order_data)
    
    # Check response
    assert response.status_code == 201
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


def test_get_orders_list(client, auth_headers, db_session, test_user):
    """Test getting a list of orders"""
    # Create multiple test products
    product1 = Product(
        name="List Test Product 1",
        description="Test Description 1",
        price=Decimal("10.00"),
        seller_id=test_user.id
    )
    product2 = Product(
        name="List Test Product 2",
        description="Test Description 2",
        price=Decimal("20.00"),
        seller_id=test_user.id
    )
    db_session.add_all([product1, product2])
    db_session.commit()
    db_session.refresh(product1)
    db_session.refresh(product2)
    
    # Create test orders
    order1 = Order(
        product_id=product1.id,
        seller_id=test_user.id,
        buyer_name="List Buyer 1",
        buyer_phone="+11111111111",
        quantity=1,
        total_amount=10.00,
        status=OrderStatus.pending
    )
    order2 = Order(
        product_id=product2.id,
        seller_id=test_user.id,
        buyer_name="List Buyer 2",
        buyer_phone="+22222222222",
        quantity=2,
        total_amount=40.00,
        status=OrderStatus.confirmed,
        order_source=OrderSource.website
    )
    db_session.add_all([order1, order2])
    db_session.commit()
    
    # Get orders list
    response = client.get("/api/v1/orders", headers=auth_headers)
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    
    # Check filtering by status
    response = client.get("/api/v1/orders?status=confirmed", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "confirmed"
    
    # Check filtering by order source
    response = client.get("/api/v1/orders?order_source=website", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["order_source"] == "website"
    
    # Check search by buyer name
    response = client.get("/api/v1/orders?search=List%20Buyer%201", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["buyer_name"] == "List Buyer 1"


def test_get_order_by_id(client, auth_headers, db_session, test_user):
    """Test getting a specific order by ID"""
    # Create test product
    product = Product(
        name="Detail Test Product",
        description="Test Description",
        price=Decimal("15.50"),
        seller_id=test_user.id
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    
    # Create test order
    order = Order(
        product_id=product.id,
        seller_id=test_user.id,
        buyer_name="Detail Buyer",
        buyer_phone="+13333333333",
        quantity=3,
        total_amount=46.50,
        buyer_email="detail@example.com",
        status=OrderStatus.processing
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    
    # Store ID values as strings for comparison
    order_id_str = str(order.id)
    product_id_str = str(product.id)
    
    # Get order by ID
    response = client.get(f"/api/v1/orders/{order_id_str}", headers=auth_headers)
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == order_id_str
    assert data["buyer_name"] == order.buyer_name
    assert data["status"] == "processing"
    assert data["product_id"] == product_id_str
    
    # Test non-existent order
    response = client.get("/api/v1/orders/00000000-0000-0000-0000-000000000999", headers=auth_headers)
    assert response.status_code == 404


def test_update_order_status(client, auth_headers, db_session, test_user):
    """Test updating an order's status"""
    # Create test product
    product = Product(
        name="Status Test Product",
        description="Test Description",
        price=Decimal("25.75"),
        seller_id=test_user.id
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    
    # Create test order
    order = Order(
        product_id=product.id,
        seller_id=test_user.id,
        buyer_name="Status Buyer",
        buyer_phone="+14444444444",
        quantity=1,
        total_amount=25.75,
        status=OrderStatus.pending
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    
    # Store the order ID as string for comparison
    order_id_str = str(order.id)
    
    # Update to shipped status with tracking info
    status_update = {
        "status": "shipped",
        "tracking_number": "TRACK123456",
        "shipping_carrier": "Test Shipping Co."
    }
    
    response = client.patch(f"/api/v1/orders/{order_id_str}/status", headers=auth_headers, json=status_update)
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "shipped"
    assert data["tracking_number"] == "TRACK123456"
    assert data["shipping_carrier"] == "Test Shipping Co."
    
    # Verify in database - query for a fresh order object
    updated_order = db_session.query(Order).filter(Order.id == UUID(order_id_str)).first()
    assert updated_order.status == OrderStatus.shipped
    assert updated_order.tracking_number == "TRACK123456"
    assert updated_order.version == 1  # Check optimistic locking worked
    
    # Test updating non-existent order
    response = client.patch("/api/v1/orders/00000000-0000-0000-0000-000000000999/status", 
                          headers=auth_headers, 
                          json={"status": "delivered"})
    assert response.status_code == 404


def test_delete_order(client, auth_headers, db_session, test_user):
    """Test deleting an order (soft delete)"""
    # Create test product
    product = Product(
        name="Delete Test Product",
        description="Test Description",
        price=Decimal("5.99"),
        seller_id=test_user.id
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    
    # Create test order
    order = Order(
        product_id=product.id,
        seller_id=test_user.id,
        buyer_name="Delete Buyer",
        buyer_phone="+15555555555",
        quantity=1,
        total_amount=5.99
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    
    # Store the order ID as string for comparison
    order_id_str = str(order.id)
    
    # Delete the order
    response = client.delete(f"/api/v1/orders/{order_id_str}", headers=auth_headers)
    
    # Check response
    assert response.status_code == 204
    
    # Verify in database (soft delete) - query for a fresh order object
    deleted_order = db_session.query(Order).filter(Order.id == UUID(order_id_str)).first()
    assert deleted_order.is_deleted is True
    
    # Try to get the deleted order
    response = client.get(f"/api/v1/orders/{order_id_str}", headers=auth_headers)
    assert response.status_code == 404
    
    # Verify it doesn't appear in the list
    response = client.get("/api/v1/orders", headers=auth_headers)
    data = response.json()
    assert order_id_str not in [o["id"] for o in data["items"]]


def test_order_dashboard_stats(client, auth_headers, db_session, test_user):
    """Test the order statistics endpoint for the seller dashboard"""
    # Create test products
    product1 = Product(
        name="Stats Product 1",
        description="Test Description 1",
        price=Decimal("10.00"),
        seller_id=test_user.id
    )
    product2 = Product(
        name="Stats Product 2",
        description="Test Description 2",
        price=Decimal("20.00"),
        seller_id=test_user.id
    )
    db_session.add_all([product1, product2])
    db_session.commit()
    db_session.refresh(product1)
    db_session.refresh(product2)
    
    # Store IDs as strings for comparison
    product1_id_str = str(product1.id)
    product2_id_str = str(product2.id)
    
    # Create multiple orders with different statuses and sources
    orders = [
        # WhatsApp orders
        Order(
            product_id=product1.id,
            seller_id=test_user.id,
            buyer_name="Stats Buyer 1",
            buyer_phone="+16666666661",
            quantity=1,
            total_amount=10.00,
            status=OrderStatus.pending,
            order_source=OrderSource.whatsapp,
            created_at=datetime.utcnow() - timedelta(days=5)
        ),
        Order(
            product_id=product1.id,
            seller_id=test_user.id,
            buyer_name="Stats Buyer 2",
            buyer_phone="+16666666662",
            quantity=2,
            total_amount=20.00,
            status=OrderStatus.shipped,
            order_source=OrderSource.whatsapp,
            created_at=datetime.utcnow() - timedelta(days=3)
        ),
        # Website orders
        Order(
            product_id=product2.id,
            seller_id=test_user.id,
            buyer_name="Stats Buyer 3",
            buyer_phone="+16666666663",
            buyer_email="stats3@example.com",
            quantity=1,
            total_amount=20.00,
            status=OrderStatus.delivered,
            order_source=OrderSource.website,
            created_at=datetime.utcnow() - timedelta(days=10)
        ),
        Order(
            product_id=product2.id,
            seller_id=test_user.id,
            buyer_name="Stats Buyer 4",
            buyer_phone="+16666666664",
            buyer_email="stats4@example.com",
            quantity=3,
            total_amount=60.00,
            status=OrderStatus.confirmed,
            order_source=OrderSource.website,
            created_at=datetime.utcnow() - timedelta(days=1)
        ),
        # Instagram order
        Order(
            product_id=product2.id,
            seller_id=test_user.id,
            buyer_name="Stats Buyer 5",
            buyer_phone="+16666666665",
            quantity=1,
            total_amount=20.00,
            status=OrderStatus.processing,
            order_source=OrderSource.instagram,
            created_at=datetime.utcnow() - timedelta(days=2)
        )
    ]
    db_session.add_all(orders)
    db_session.commit()
    
    # Get dashboard stats
    response = client.get("/api/v1/dashboard/orders/stats", headers=auth_headers)
    
    # Check response
    assert response.status_code == 200
    stats = response.json()
    
    # Check total orders and revenue
    assert stats["total_orders"] == 5
    assert stats["total_revenue"] == 130.0
    
    # Check orders by status
    assert "pending" in stats["orders_by_status"]
    assert stats["orders_by_status"]["pending"] == 1
    assert stats["orders_by_status"]["shipped"] == 1
    assert stats["orders_by_status"]["delivered"] == 1
    assert stats["orders_by_status"]["confirmed"] == 1
    assert stats["orders_by_status"]["processing"] == 1
    
    # Check orders by source
    assert "whatsapp" in stats["orders_by_source"]
    assert stats["orders_by_source"]["whatsapp"] == 2
    assert stats["orders_by_source"]["website"] == 2
    assert stats["orders_by_source"]["instagram"] == 1
    
    # Check top products
    assert len(stats["top_products"]) > 0
    # Product 2 should be the top product by order count and revenue
    top_product = next((p for p in stats["top_products"] if p["id"] == product2_id_str), None)
    assert top_product is not None
    assert top_product["revenue"] == 100.0  # 20.00 * 1 + 20.00 * 3 + 20.00 * 1
    
    # Check with different time period
    response = client.get("/api/v1/dashboard/orders/stats?days=7", headers=auth_headers)
    stats = response.json()
    assert stats["total_orders"] == 4  # One order is more than 7 days old
    
    # The time_period_days should match our query
    assert stats["time_period_days"] == 7


def test_order_notification_marking(client, auth_headers, db_session, test_user):
    """Test marking an order as having had notifications sent"""
    # Create test product
    product = Product(
        name="Notification Test Product",
        description="Test Description",
        price=Decimal("35.50"),
        seller_id=test_user.id
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    
    # Create test order
    order = Order(
        product_id=product.id,
        seller_id=test_user.id,
        buyer_name="Notification Buyer",
        buyer_phone="+17777777777",
        whatsapp_number="+17777777777",
        quantity=1,
        total_amount=35.50,
        notification_sent=False
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    
    # Store the order ID as string for comparison
    order_id_str = str(order.id)
    
    # Mark notification as sent
    response = client.post(f"/api/v1/orders/{order_id_str}/notification", headers=auth_headers)
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "successfully" in data["message"].lower()
    
    # Verify in database - query for a fresh order object
    notified_order = db_session.query(Order).filter(Order.id == UUID(order_id_str)).first()
    assert notified_order.notification_sent is True
    assert notified_order.version == 1  # Check optimistic locking worked
    
    # Test with non-existent order
    response = client.post("/api/v1/orders/00000000-0000-0000-0000-000000000999/notification", 
                         headers=auth_headers)
    assert response.status_code == 404
