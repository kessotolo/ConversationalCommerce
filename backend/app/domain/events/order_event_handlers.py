import logging
from app.domain.events.order_events import (
    OrderStatusChangedEvent,
    OrderShippedEvent,
    OrderDeliveredEvent,
    OrderCancelledEvent,
    PaymentProcessedEvent
)
from app.domain.events.event_bus import get_event_bus

logger = logging.getLogger(__name__)


async def handle_order_status_changed(event: OrderStatusChangedEvent):
    logger.info(
        f"Order status changed: {event.order_id} {event.previous_status} -> {event.new_status} by {event.changed_by}")
    # Add notification, analytics, or fulfillment logic here


async def handle_order_shipped(event: OrderShippedEvent):
    logger.info(
        f"Order shipped: {event.order_id} tracking={event.tracking_number} provider={event.shipping_provider}")
    # Add notification, analytics, or fulfillment logic here


async def handle_order_delivered(event: OrderDeliveredEvent):
    logger.info(
        f"Order delivered: {event.order_id} delivered_at={event.delivery_date}")
    # Add notification, analytics, or fulfillment logic here


async def handle_order_cancelled(event: OrderCancelledEvent):
    logger.info(
        f"Order cancelled: {event.order_id} reason={event.cancellation_reason} by={event.cancelled_by}")
    # Add notification, analytics, or fulfillment logic here


async def handle_payment_processed(event: PaymentProcessedEvent):
    logger.info(
        f"Payment processed: {event.order_id} payment_id={event.payment_id} amount={event.amount} by {event.processed_by}")
    # Add notification, analytics, or fulfillment logic here

# Register the handlers
get_event_bus().subscribe('ORDER_STATUS_CHANGED', handle_order_status_changed)
get_event_bus().subscribe('ORDER_SHIPPED', handle_order_shipped)
get_event_bus().subscribe('ORDER_DELIVERED', handle_order_delivered)
get_event_bus().subscribe('ORDER_CANCELLED', handle_order_cancelled)
get_event_bus().subscribe('PAYMENT_PROCESSED', handle_payment_processed)
