import pytest
from uuid import UUID
from decimal import Decimal

from backend.app.models.order import Order, OrderStatus, OrderSource
from backend.app.models.order_channel_meta import OrderChannelMeta
from backend.app.models.conversation_history import ChannelType
from backend.app.models.product import Product


@pytest.fixture
def whatsapp_product(db_session, test_user, test_tenant):
    """Create a test product for WhatsApp order testing"""
    # Set tenant context for the session
    from sqlalchemy import text

    tenant_id = str(test_tenant.id)
    db_session.execute(text(f"SET LOCAL my.tenant_id = '{tenant_id}'"))

    product = Product(
        name="WhatsApp Product",
        description="Test product for WhatsApp order",
        price=49.99,
        seller_id=test_user.id,
        show_on_whatsapp=True,
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def test_create_whatsapp_order_success(
    client, auth_headers, db_session, whatsapp_product, test_tenant
):
    """Test creating a WhatsApp order with all required fields"""
    # Create WhatsApp order data with channel metadata
    order_data = {
        "product_id": str(whatsapp_product.id),
        "buyer_name": "WhatsApp Buyer",
        "buyer_phone": "+1987654321",
        "quantity": 2,
        "total_amount": 99.98,
        "whatsapp_number": str(test_tenant.whatsapp_number or "+1987654321"),
        "message_id": "test_message_id",
        "conversation_id": "test_conversation_id",
        "channel_metadata": {
            "channel": "whatsapp",
            "message_id": "test_message_id",
            "chat_session_id": "test_conversation_id",
        },
    }

    # Submit the WhatsApp order
    response = client.post(
        "/api/v1/orders/whatsapp", headers=auth_headers, json=order_data
    )

    # Check response
    assert (
        response.status_code == 201
    ), f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["buyer_name"] == order_data["buyer_name"]
    assert data["quantity"] == order_data["quantity"]
    assert data["order_source"] == "whatsapp"

    # Check channel metadata in response
    assert "channel_metadata" in data
    assert (
        data["channel_metadata"]["message_id"]
        == order_data["channel_metadata"]["message_id"]
    )
    assert (
        data["channel_metadata"]["chat_session_id"]
        == order_data["channel_metadata"]["chat_session_id"]
    )

    # Verify in database
    order_id = UUID(data["id"])
    db_order = db_session.query(Order).filter(Order.id == order_id).first()
    assert db_order is not None
    assert db_order.order_source == OrderSource.whatsapp

    # Verify channel metadata in database
    channel_meta = (
        db_session.query(OrderChannelMeta)
        .filter(OrderChannelMeta.order_id == order_id)
        .first()
    )
    assert channel_meta is not None
    assert channel_meta.channel == ChannelType.whatsapp
    assert channel_meta.message_id == order_data["channel_metadata"]["message_id"]
    assert (
        channel_meta.chat_session_id
        == order_data["channel_metadata"]["chat_session_id"]
    )


def test_create_whatsapp_order_missing_whatsapp_fields(
    client, auth_headers, whatsapp_product
):
    """Test creating a WhatsApp order without required WhatsApp-specific channel metadata"""
    # Attempt to create an order without channel_metadata
    incomplete_data = {
        "product_id": str(whatsapp_product.id),
        "buyer_name": "WhatsApp Buyer",
        "buyer_phone": "+1987654321",
        "quantity": 2,
        "total_amount": 99.98,
        # Missing channel_metadata
    }

    response = client.post(
        "/api/v1/orders/whatsapp", headers=auth_headers, json=incomplete_data
    )
    assert response.status_code == 422

    # Attempt with empty channel_metadata
    incomplete_data = {
        "product_id": str(whatsapp_product.id),
        "buyer_name": "WhatsApp Buyer",
        "buyer_phone": "+1987654321",
        "quantity": 2,
        "total_amount": 99.98,
        "channel_metadata": {},
        # Missing channel, message_id, chat_session_id
    }

    response = client.post(
        "/api/v1/orders/whatsapp", headers=auth_headers, json=incomplete_data
    )
    assert response.status_code == 422


def test_create_whatsapp_order_invalid_phone(client, auth_headers, whatsapp_product):
    """Test creating a WhatsApp order with invalid phone number format"""
    order_data = {
        "product_id": str(whatsapp_product.id),
        "buyer_name": "WhatsApp Buyer",
        "buyer_phone": "invalid-phone",  # Invalid phone format
        "quantity": 1,
        "total_amount": 49.99,
        "channel_metadata": {
            "channel": "whatsapp",
            "message_id": "test_message_id",
            "chat_session_id": "test_conversation_id",
        },
    }

    response = client.post(
        "/api/v1/orders/whatsapp", headers=auth_headers, json=order_data
    )
    assert response.status_code == 422


def test_get_whatsapp_orders_by_number(
    client, db_session, test_user, auth_headers, test_tenant
):
    """Test getting orders for a specific WhatsApp number"""
    # Create test product
    product = Product(
        name="WhatsApp Product",
        description="Test Description",
        price=Decimal("25.00"),
        seller_id=test_user.id,
        show_on_whatsapp=True,
    )
    db_session.add(product)
    db_session.commit()

    # Create multiple WhatsApp orders with the same number
    whatsapp_number = "+9876543210"
    orders = []
    order_channel_metas = []

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
        )
        orders.append(order)
        db_session.add(order)
        db_session.flush()  # Get the order ID without committing

        # Create the OrderChannelMeta for this order
        channel_meta = OrderChannelMeta(
            order_id=order.id,
            channel=ChannelType.whatsapp,
            message_id=f"message_id_{i}",
            chat_session_id=f"conversation_id_{i}",
            user_response_log=whatsapp_number,
        )
        order_channel_metas.append(channel_meta)

    db_session.add_all(order_channel_metas)
    db_session.commit()

    # Get orders by WhatsApp number
    response = client.get(
        f"/api/v1/orders/whatsapp?whatsapp_number={whatsapp_number}",
        headers=auth_headers,
    )

    # Check response
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3

    # Verify order details
    for i, order in enumerate(data):
        assert order["buyer_name"] == f"WhatsApp Buyer {i}"
        assert order["channel_metadata"]["user_response_log"] == whatsapp_number


def test_get_whatsapp_orders_with_filters(
    client, db_session, test_user, auth_headers, test_tenant
):
    """Test getting WhatsApp orders with status filters"""
    # Create test product
    product = Product(
        name="Filter Test Product",
        description="Test Description",
        price=Decimal("25.00"),
        seller_id=test_user.id,
        show_on_whatsapp=True,
    )
    db_session.add(product)
    db_session.commit()

    # Create WhatsApp orders with different statuses
    whatsapp_number = "+5551234567"

    # Pending order
    pending_order = Order(
        product_id=product.id,
        seller_id=test_user.id,
        buyer_name="Pending Order",
        buyer_phone=whatsapp_number,
        quantity=1,
        total_amount=25.00,
        status=OrderStatus.pending,
        order_source=OrderSource.whatsapp,
    )
    db_session.add(pending_order)
    db_session.flush()

    pending_meta = OrderChannelMeta(
        order_id=pending_order.id,
        channel=ChannelType.whatsapp,
        message_id="pending_message_id",
        chat_session_id="pending_conversation_id",
        user_response_log=whatsapp_number,
    )

    # Confirmed order
    confirmed_order = Order(
        product_id=product.id,
        seller_id=test_user.id,
        buyer_name="Confirmed Order",
        buyer_phone=whatsapp_number,
        quantity=1,
        total_amount=25.00,
        status=OrderStatus.confirmed,
        order_source=OrderSource.whatsapp,
    )
    db_session.add(confirmed_order)
    db_session.flush()

    confirmed_meta = OrderChannelMeta(
        order_id=confirmed_order.id,
        channel=ChannelType.whatsapp,
        message_id="confirmed_message_id",
        chat_session_id="confirmed_conversation_id",
        user_response_log=whatsapp_number,
    )

    # Delivered order
    delivered_order = Order(
        product_id=product.id,
        seller_id=test_user.id,
        buyer_name="Delivered Order",
        buyer_phone=whatsapp_number,
        quantity=1,
        total_amount=25.00,
        status=OrderStatus.delivered,
        order_source=OrderSource.whatsapp,
    )
    db_session.add(delivered_order)
    db_session.flush()

    delivered_meta = OrderChannelMeta(
        order_id=delivered_order.id,
        channel=ChannelType.whatsapp,
        message_id="delivered_message_id",
        chat_session_id="delivered_conversation_id",
        user_response_log=whatsapp_number,
    )

    # Add channel metadata to database
    db_session.add_all([pending_meta, confirmed_meta, delivered_meta])
    db_session.commit()

    # Get only confirmed orders
    response = client.get(
        f"/api/v1/orders/whatsapp/{whatsapp_number}?status=confirmed",
        headers=auth_headers,
    )

    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "confirmed"

    # Get only pending orders
    response = client.get(
        f"/api/v1/orders/whatsapp/{whatsapp_number}?status=pending",
        headers=auth_headers,
    )

    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "pending"


def test_get_whatsapp_orders_invalid_number(client, auth_headers):
    """Test getting orders with an invalid WhatsApp number format"""
    response = client.get(
        "/api/v1/orders/whatsapp?whatsapp_number=invalid-number", headers=auth_headers
    )
    assert response.status_code == 422


def test_get_whatsapp_orders_nonexistent_number(
    client, db_session, test_user, auth_headers, test_tenant
):
    """Test getting orders with a nonexistent WhatsApp number (should return empty list)"""
    response = client.get(
        "/api/v1/orders/whatsapp?whatsapp_number=+1234567890", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0
