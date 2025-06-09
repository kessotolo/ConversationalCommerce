import pytest
import asyncio
from unittest.mock import patch, AsyncMock
from app.domain.events.order_event_handlers import (
    handle_order_created,
    handle_order_status_changed,
    handle_order_shipped,
    handle_order_delivered,
    handle_order_cancelled,
    handle_payment_processed
)
from app.domain.events.order_events import (
    OrderCreatedEvent,
    OrderStatusChangedEvent,
    OrderShippedEvent,
    OrderDeliveredEvent,
    OrderCancelledEvent,
    PaymentProcessedEvent
)
from datetime import datetime
from app.domain.models.order import (
    Order,
    OrderStatus,
    OrderSource,
    PaymentMethod,
    PaymentStatus,
    Money,
    CustomerInfo,
    OrderItem,
    ShippingDetails,
    PaymentDetails,
    Address
)


@pytest.mark.asyncio
@patch("app.domain.events.order_event_handlers.NotificationService", autospec=True)
@patch("app.domain.events.order_event_handlers.logger")
async def test_handle_order_created(mock_logger, mock_notification_service):
    # Construct a valid Order instance
    order = Order(
        id="order1",
        tenant_id="tenant1",
        order_number="1001",
        customer=CustomerInfo(id="user1", name="Test User",
                              phone="+254712345678"),
        items=[OrderItem(
            product_id="prod1",
            product_name="Test Product",
            quantity=1,
            unit_price=Money(amount=100, currency="USD"),
            total_price=Money(amount=100, currency="USD")
        )],
        total_amount=Money(amount=100, currency="USD"),
        subtotal=Money(amount=100, currency="USD"),
        tax=Money(amount=0, currency="USD"),
        status=OrderStatus.PENDING,
        source=OrderSource.WEBSITE,
        shipping=ShippingDetails(
            address=Address(street="123 Main St", city="Nairobi",
                            state="Nairobi", country="Kenya"),
            method="Standard Delivery",
            shipping_cost=Money(amount=0, currency="USD")
        ),
        payment=PaymentDetails(
            method=PaymentMethod.MOBILE_MONEY,
            status=PaymentStatus.PENDING,
            amount_paid=Money(amount=100, currency="USD")
        ),
        idempotency_key="idem1"
    )
    event = OrderCreatedEvent(
        event_id="evt1",
        tenant_id="tenant1",
        order_id="order1",
        order_number="1001",
        order=order,
        timestamp=datetime.utcnow()
    )
    mock_notification_service.return_value.send_notification = AsyncMock()
    await handle_order_created(event)
    mock_notification_service.return_value.send_notification.assert_awaited()
    assert mock_logger.info.call_count >= 2


@pytest.mark.asyncio
@patch("app.domain.events.order_event_handlers.NotificationService", autospec=True)
@patch("app.domain.events.order_event_handlers.logger")
async def test_handle_order_status_changed(mock_logger, mock_notification_service):
    event = OrderStatusChangedEvent(
        event_id="evt2",
        tenant_id="tenant1",
        order_id="order2",
        order_number="1002",
        previous_status="PENDING",
        new_status="SHIPPED",
        changed_by="user2",
        timestamp=datetime.utcnow()
    )
    mock_notification_service.return_value.send_notification = AsyncMock()
    await handle_order_status_changed(event)
    mock_notification_service.return_value.send_notification.assert_awaited()
    assert mock_logger.info.call_count >= 2


@pytest.mark.asyncio
@patch("app.domain.events.order_event_handlers.NotificationService", autospec=True)
@patch("app.domain.events.order_event_handlers.logger")
async def test_handle_order_shipped(mock_logger, mock_notification_service):
    event = OrderShippedEvent(
        event_id="evt3",
        tenant_id="tenant1",
        order_id="order3",
        order_number="1003",
        tracking_number="TRACK123",
        shipping_provider="DHL",
        timestamp=datetime.utcnow()
    )
    mock_notification_service.return_value.send_notification = AsyncMock()
    await handle_order_shipped(event)
    mock_notification_service.return_value.send_notification.assert_awaited()
    assert mock_logger.info.call_count >= 2


@pytest.mark.asyncio
@patch("app.domain.events.order_event_handlers.NotificationService", autospec=True)
@patch("app.domain.events.order_event_handlers.logger")
async def test_handle_order_delivered(mock_logger, mock_notification_service):
    event = OrderDeliveredEvent(
        event_id="evt4",
        tenant_id="tenant1",
        order_id="order4",
        order_number="1004",
        delivery_date=datetime.utcnow(),
        timestamp=datetime.utcnow()
    )
    mock_notification_service.return_value.send_notification = AsyncMock()
    await handle_order_delivered(event)
    mock_notification_service.return_value.send_notification.assert_awaited()
    assert mock_logger.info.call_count >= 2


@pytest.mark.asyncio
@patch("app.domain.events.order_event_handlers.NotificationService", autospec=True)
@patch("app.domain.events.order_event_handlers.logger")
async def test_handle_order_cancelled(mock_logger, mock_notification_service):
    event = OrderCancelledEvent(
        event_id="evt5",
        tenant_id="tenant1",
        order_id="order5",
        order_number="1005",
        cancellation_reason="Customer request",
        cancelled_by="user5",
        refund_initiated=False,
        timestamp=datetime.utcnow()
    )
    mock_notification_service.return_value.send_notification = AsyncMock()
    await handle_order_cancelled(event)
    mock_notification_service.return_value.send_notification.assert_awaited()
    assert mock_logger.info.call_count >= 2


@pytest.mark.asyncio
@patch("app.domain.events.order_event_handlers.NotificationService", autospec=True)
@patch("app.domain.events.order_event_handlers.logger")
async def test_handle_payment_processed(mock_logger, mock_notification_service):
    event = PaymentProcessedEvent(
        event_id="evt6",
        tenant_id="tenant1",
        order_id="order6",
        order_number="1006",
        transaction_id="txn1",
        amount=Money(amount=100, currency="USD"),
        payment_status="COMPLETED",
        payment_method="MOBILE_MONEY",
        payment_provider=None,
        timestamp=datetime.utcnow()
    )
    mock_notification_service.return_value.send_notification = AsyncMock()
    await handle_payment_processed(event)
    mock_notification_service.return_value.send_notification.assert_awaited()
    assert mock_logger.info.call_count >= 2
