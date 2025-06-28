import pytest
from uuid import uuid4
from decimal import Decimal

from app.models.order import Order, OrderStatus, OrderSource
from app.models.order_channel_meta import OrderChannelMeta
from app.models.conversation_history import ChannelType
from app.models.product import Product


@pytest.fixture
def test_products(db_session, test_user, test_tenant):
    """Create multiple test products for order testing"""
    # Set tenant context for the session
    from sqlalchemy import text

    tenant_id = str(test_tenant.id)
    db_session.execute(text(f"SET LOCAL my.tenant_id = '{tenant_id}'"))

    products = []
    for i in range(1, 4):
        product = Product(
            name="Test Product",
            description="Test product for order operations",
            price=10.0,
            seller_id=test_user.id,
        )
        # If needed, set tenant_id after creation
        # product.tenant_id = test_tenant.id
        products.append(product)

    db_session.add_all(products)
    db_session.commit()
    for product in products:
        db_session.refresh(product)

    return products


@pytest.fixture
def test_orders(db_session, test_user, test_products):
    """Create test orders with different statuses and sources"""
    orders = []

    # Create web order
    web_order = Order(
        product_id=test_products[0].id,
        seller_id=test_user.id,
        buyer_name="Web Buyer",
        buyer_phone="+1234567890",
        buyer_email="web@example.com",
        quantity=1,
        total_amount=Decimal("10.99"),
        status=OrderStatus.pending,
        order_source=OrderSource.website,
    )
    orders.append(web_order)
    db_session.add(web_order)  # Explicitly add to session

    # Create WhatsApp order
    whatsapp_order = Order(
        product_id=test_products[1].id,
        seller_id=test_user.id,
        buyer_name="WhatsApp Buyer",
        buyer_phone="+2345678901",
        quantity=1,
        total_amount=Decimal("20.99"),
        status=OrderStatus.confirmed,
        order_source=OrderSource.whatsapp,
    )
    orders.append(whatsapp_order)
    db_session.add(whatsapp_order)
    db_session.flush()  # Flush to get the ID

    # Create Instagram order
    instagram_order = Order(
        product_id=test_products[2].id,
        seller_id=test_user.id,
        buyer_name="Instagram Buyer",
        buyer_phone="+3456789012",
        buyer_email="instagram@example.com",
        quantity=2,
        total_amount=Decimal("61.98"),
        status=OrderStatus.delivered,
        order_source=OrderSource.instagram,
    )
    orders.append(instagram_order)
    db_session.add(instagram_order)  # Explicitly add to session

    # Create WhatsApp metadata
    whatsapp_metadata = OrderChannelMeta(
        order_id=whatsapp_order.id,
        channel=ChannelType.whatsapp,
        message_id="test_message_id",
        chat_session_id="test_conversation_id",
        user_response_log="Test response log",
    )
    db_session.add(whatsapp_metadata)

    # Commit all changes
    db_session.commit()

    # Refresh all orders
    for order in orders:
        db_session.refresh(order)

    return orders


# Tests for GET /api/v1/orders (list all orders)
def test_get_orders_list(client, db_session, test_user, auth_headers, test_tenant):
    """Test getting all orders without filters"""
    response = client.get("/api/v1/orders", headers=auth_headers)

    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 3


def test_get_orders_with_status_filter(
    client, db_session, test_user, auth_headers, test_tenant
):
    """Test filtering orders by status"""
    # Filter by pending status
    response = client.get("/api/v1/orders?status=pending", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "pending"

    # Filter by confirmed status
    response = client.get("/api/v1/orders?status=confirmed", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "confirmed"

    # Filter by delivered status
    response = client.get("/api/v1/orders?status=delivered", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "delivered"

    # Filter by nonexistent status
    response = client.get("/api/v1/orders?status=nonexistent", headers=auth_headers)
    assert response.status_code == 422  # Should return validation error


def test_get_orders_with_source_filter(
    client, db_session, test_user, auth_headers, test_tenant
):
    """Test filtering orders by source"""
    # Filter by website source
    response = client.get("/api/v1/orders?order_source=website", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["order_source"] == "website"

    # Filter by whatsapp source
    response = client.get("/api/v1/orders?order_source=whatsapp", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["order_source"] == "whatsapp"

    # Filter by instagram source
    response = client.get("/api/v1/orders?order_source=instagram", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["order_source"] == "instagram"

    # Filter by nonexistent source
    response = client.get(
        "/api/v1/orders?order_source=nonexistent", headers=auth_headers
    )
    assert response.status_code == 422  # Should return validation error


def test_get_orders_with_combined_filters(
    client, db_session, test_user, auth_headers, test_tenant
):
    """Test combining multiple filters"""
    # No results expected with this combination
    response = client.get(
        "/api/v1/orders?status=pending&order_source=whatsapp", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0

    # Should return one result
    response = client.get(
        "/api/v1/orders?status=confirmed&order_source=whatsapp", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "confirmed"
    assert data["items"][0]["order_source"] == "whatsapp"


def test_get_orders_with_search(
    client, db_session, test_user, auth_headers, test_tenant
):
    """Test search functionality in orders list"""
    # Search by buyer name
    response = client.get("/api/v1/orders?search=WhatsApp+Buyer", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["buyer_name"] == "WhatsApp Buyer"

    # Search by phone (partial match)
    response = client.get("/api/v1/orders?search=345678", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1  # Should match at least one order


def test_get_orders_with_pagination(
    client, db_session, test_user, auth_headers, test_tenant
):
    """Test pagination for orders list"""
    # Create 10 orders for pagination testing
    orders = []
    for i in range(10):
        order = Order(
            product_id=test_products[0].id,
            seller_id=test_user.id,
            buyer_name=f"Pagination Buyer {i}",
            buyer_phone=f"+1000000{i:04d}",
            quantity=1,
            total_amount=Decimal("10.99"),
            status=OrderStatus.pending,
            order_source=OrderSource.website,
        )
        orders.append(order)

    db_session.add_all(orders)
    db_session.commit()

    # Test first page (default limit is typically 10)
    response = client.get("/api/v1/orders", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 10

    # Test with specific limit
    response = client.get("/api/v1/orders?limit=5", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 5

    # Test with skip
    first_page = client.get("/api/v1/orders?limit=3", headers=auth_headers).json()
    second_page = client.get(
        "/api/v1/orders?limit=3&skip=3", headers=auth_headers
    ).json()

    # Verify pages contain different items
    first_ids = [item["id"] for item in first_page["items"]]
    second_ids = [item["id"] for item in second_page["items"]]
    assert not any(id in second_ids for id in first_ids)


# Tests for GET /api/v1/orders/{order_id}
def test_get_order_by_id(client, db_session, test_user, auth_headers, test_tenant):
    """Test getting a specific order by ID"""
    order_id = str(test_orders[0].id)

    response = client.get(f"/api/v1/orders/{order_id}", headers=auth_headers)

    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == order_id
    assert data["buyer_name"] == test_orders[0].buyer_name
    assert data["status"] == test_orders[0].status.value


def test_get_nonexistent_order(
    client, db_session, test_user, auth_headers, test_tenant
):
    """Test getting a non-existent order ID"""
    nonexistent_id = str(uuid4())
    response = client.get(f"/api/v1/orders/{nonexistent_id}", headers=auth_headers)
    assert response.status_code == 404
    assert "Order not found" in response.json()["detail"]


def test_get_order_invalid_uuid(client, auth_headers):
    """Test getting an order with invalid UUID format"""
    response = client.get("/api/v1/orders/not-a-valid-uuid", headers=auth_headers)
    assert response.status_code == 422  # Validation error for invalid UUID


# Tests for PUT /api/v1/orders/{order_id}
def test_update_order_status(client, db_session, test_user, auth_headers, test_tenant):
    """Test updating an order's status"""
    order_id = str(test_orders[0].id)
    update_data = {"status": "confirmed"}

    # Update the order
    response = client.put(
        f"/api/v1/orders/{order_id}", headers=auth_headers, json=update_data
    )

    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == order_id
    assert data["status"] == "confirmed"

    # Verify in database
    db_session.refresh(test_orders[0])
    assert test_orders[0].status == OrderStatus.confirmed


def test_update_order_multiple_fields(
    client, db_session, test_user, auth_headers, test_tenant
):
    """Test updating multiple fields of an order"""
    order_id = str(test_orders[1].id)
    update_data = {
        "buyer_name": "Updated Name",
        "buyer_phone": "+9876543210",
        "quantity": 3,
        "total_amount": 62.97,
        "notes": "Updated notes",
    }

    response = client.put(
        f"/api/v1/orders/{order_id}", headers=auth_headers, json=update_data
    )

    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["buyer_name"] == update_data["buyer_name"]
    assert data["buyer_phone"] == update_data["buyer_phone"]
    assert data["quantity"] == update_data["quantity"]
    assert float(data["total_amount"]) == update_data["total_amount"]
    assert data["notes"] == update_data["notes"]


def test_update_nonexistent_order(
    client, db_session, test_user, auth_headers, test_tenant
):
    """Test updating a non-existent order"""
    nonexistent_id = str(uuid4())
    update_data = {"status": "confirmed"}

    response = client.put(
        f"/api/v1/orders/{nonexistent_id}", headers=auth_headers, json=update_data
    )
    assert response.status_code == 404
    assert "Order not found" in response.json()["detail"]


def test_update_order_invalid_status(client, auth_headers, test_orders):
    """Test updating an order with invalid status value"""
    order_id = str(test_orders[0].id)
    update_data = {"status": "invalid_status"}

    response = client.put(
        f"/api/v1/orders/{order_id}", headers=auth_headers, json=update_data
    )
    assert response.status_code == 422  # Validation error


# Tests for DELETE /api/v1/orders/{order_id}
def test_delete_order(client, db_session, test_user, auth_headers, test_tenant):
    """Test deleting an order (soft delete)"""
    order_id = str(test_orders[0].id)

    # Delete the order
    response = client.delete(f"/api/v1/orders/{order_id}", headers=auth_headers)

    # Check response
    assert response.status_code == 200

    # Verify in database (should be soft deleted)
    db_session.refresh(test_orders[0])
    assert test_orders[0].is_deleted

    # Attempt to get the deleted order
    get_response = client.get(f"/api/v1/orders/{order_id}", headers=auth_headers)
    assert get_response.status_code == 404  # Should not be found


def test_delete_nonexistent_order(
    client, db_session, test_user, auth_headers, test_tenant
):
    """Test deleting a non-existent order"""
    nonexistent_id = str(uuid4())

    response = client.delete(f"/api/v1/orders/{nonexistent_id}", headers=auth_headers)
    assert response.status_code == 404
    assert "Order not found" in response.json()["detail"]


def test_delete_already_deleted_order(
    client, db_session, test_user, auth_headers, test_tenant
):
    """Test deleting an already deleted order"""
    order_id = str(test_orders[2].id)

    # Delete the order first
    test_orders[2].is_deleted = True
    db_session.commit()

    # Try deleting again
    response = client.delete(f"/api/v1/orders/{order_id}", headers=auth_headers)
    assert response.status_code == 404
    assert "Order not found" in response.json()["detail"]


def test_authentication_required(client, test_orders):
    """Test that all order endpoints require authentication"""
    order_id = str(test_orders[0].id)

    # Test list endpoint
    response = client.get("/api/v1/orders")
    assert response.status_code in (401, 403)

    # Test get by ID endpoint
    response = client.get(f"/api/v1/orders/{order_id}")
    assert response.status_code in (401, 403)

    # Test update endpoint
    response = client.put(f"/api/v1/orders/{order_id}", json={"status": "confirmed"})
    assert response.status_code in (401, 403)

    # Test delete endpoint
    response = client.delete(f"/api/v1/orders/{order_id}")
    assert response.status_code in (401, 403)
