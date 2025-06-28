import json
import logging

from sqlalchemy import update

from app.core.notifications.notification_service import (
    Notification,
    NotificationChannel,
    NotificationService,
)
from app.domain.events.event_bus import get_event_bus
from app.domain.events.order_events import (
    OrderCancelledEvent,
    OrderCreatedEvent,
    OrderDeliveredEvent,
    OrderShippedEvent,
    OrderStatusChangedEvent,
    PaymentProcessedEvent,
)
from app.models.product import Product
from app.services.order_service import OrderService

logger = logging.getLogger(__name__)

"""
Developer Note: Event Flow
-------------------------
All order lifecycle changes (creation, payment, status change, cancellation, refund) emit domain events via the event bus.
Handlers are registered for each event type to perform side effects (notifications, analytics, inventory deduction, etc.).
Never update order status or perform side effects directly in service logic—always use events and handlers for extensibility and auditability.
"""


def analytics_log_event(event_type, **kwargs):
    """Log structured analytics event as JSON."""
    log_data = {"event_type": event_type, **kwargs}
    logger.info("[Analytics] %s", json.dumps(log_data))


async def handle_order_created(event: OrderCreatedEvent):
    # 1. Send notification (email/SMS/WhatsApp)
    notification = Notification(
        id=event.event_id,
        tenant_id=event.tenant_id,
        user_id=event.order.customer.id or "",
        title="Order Confirmation",
        message=f"Your order #{event.order.order_number} has been created!",
        priority="medium",
        channels=[NotificationChannel.EMAIL, NotificationChannel.SMS],
        metadata={"order_id": event.order_id},
    )
    service = NotificationService()
    try:
        await service.send_notification(notification)
    except Exception as e:
        logger.error(
            f"Notification sending failed for order {event.order_id}: {str(e)}"
        )

    # 2. Log analytics (placeholder: log to logger)
    analytics_log_event(
        "OrderCreated",
        order_id=event.order_id,
        value=event.order.total_amount.amount,
        currency=event.order.total_amount.currency,
    )

    # 3. Trigger fulfillment workflow (placeholder)
    logger.info(
        f"[Fulfillment] Trigger fulfillment for order {event.order_id}")


async def handle_order_status_changed(event: OrderStatusChangedEvent):
    # 1. Send notification (email/SMS/WhatsApp)
    notification = Notification(
        id=event.event_id,
        tenant_id=event.tenant_id,
        user_id=event.changed_by or "",
        title="Order Status Updated",
        message=f"Your order #{event.order_number} status changed: {event.previous_status} → {event.new_status}",
        priority="medium",
        channels=[NotificationChannel.EMAIL, NotificationChannel.SMS],
        metadata={"order_id": event.order_id, "new_status": event.new_status},
    )
    service = NotificationService()
    try:
        await service.send_notification(notification)
    except Exception as e:
        logger.error(
            f"Notification sending failed for order {event.order_id}: {str(e)}"
        )

    # 2. Log analytics
    analytics_log_event(
        "OrderStatusChanged",
        order_id=event.order_id,
        previous_status=event.previous_status,
        new_status=event.new_status,
    )

    # 3. Fulfillment/side effects
    logger.info(
        f"[Fulfillment] Handle status change for order {event.order_id} to {event.new_status}"
    )


async def handle_order_shipped(event: OrderShippedEvent):
    # 1. Send notification
    notification = Notification(
        id=event.event_id,
        tenant_id=event.tenant_id,
        user_id="",
        title="Order Shipped",
        message=f"Your order #{event.order_number} has shipped! Tracking: {event.tracking_number}",
        priority="medium",
        channels=[NotificationChannel.EMAIL, NotificationChannel.SMS],
        metadata={"order_id": event.order_id,
                  "tracking_number": event.tracking_number},
    )
    service = NotificationService()
    try:
        await service.send_notification(notification)
    except Exception as e:
        logger.error(
            f"Notification sending failed for order {event.order_id}: {str(e)}"
        )

    # 2. Log analytics
    analytics_log_event(
        "OrderShipped", order_id=event.order_id, tracking_number=event.tracking_number
    )

    # 3. Fulfillment/side effects
    logger.info(
        f"[Fulfillment] Notify warehouse/shipping provider for order {event.order_id}"
    )


async def handle_order_delivered(event: OrderDeliveredEvent):
    # 1. Send notification
    notification = Notification(
        id=event.event_id,
        tenant_id=event.tenant_id,
        user_id="",
        title="Order Delivered",
        message=f"Your order #{event.order_number} was delivered on {event.delivery_date}",
        priority="medium",
        channels=[NotificationChannel.EMAIL, NotificationChannel.SMS],
        metadata={
            "order_id": event.order_id,
            "delivery_date": str(event.delivery_date),
        },
    )
    service = NotificationService()
    try:
        await service.send_notification(notification)
    except Exception as e:
        logger.error(
            f"Notification sending failed for order {event.order_id}: {str(e)}"
        )

    # 2. Log analytics
    analytics_log_event(
        "OrderDelivered", order_id=event.order_id, delivery_date=event.delivery_date
    )

    # 3. Fulfillment/side effects
    logger.info(
        f"[Fulfillment] Complete fulfillment for order {event.order_id}")


async def handle_order_cancelled(event: OrderCancelledEvent):
    # 1. Send notification
    notification = Notification(
        id=event.event_id,
        tenant_id=event.tenant_id,
        user_id=event.cancelled_by or "",
        title="Order Cancelled",
        message=f"Your order #{event.order_number} was cancelled. Reason: {event.cancellation_reason}",
        priority="medium",
        channels=[NotificationChannel.EMAIL, NotificationChannel.SMS],
        metadata={"order_id": event.order_id,
                  "reason": event.cancellation_reason},
    )
    service = NotificationService()
    try:
        await service.send_notification(notification)
    except Exception as e:
        logger.error(
            f"Notification sending failed for order {event.order_id}: {str(e)}"
        )

    # 2. Log analytics
    analytics_log_event(
        "OrderCancelled", order_id=event.order_id, reason=event.cancellation_reason
    )

    # 3. Fulfillment/side effects
    logger.info(
        f"[Fulfillment] Cancel fulfillment/refund for order {event.order_id}")


async def handle_payment_processed(event: PaymentProcessedEvent):
    # 1. Send notification
    notification = Notification(
        id=event.event_id,
        tenant_id=event.tenant_id,
        user_id="",
        title="Payment Processed",
        message=f"Payment for order #{event.order_number} was processed. Amount: {event.amount}",
        priority="medium",
        channels=[NotificationChannel.EMAIL, NotificationChannel.SMS],
        metadata={"order_id": event.order_id,
                  "transaction_id": event.transaction_id},
    )
    service = NotificationService()
    try:
        await service.send_notification(notification)
    except Exception as e:
        logger.error(
            f"Notification sending failed for order {event.order_id}: {str(e)}"
        )

    # 2. Log analytics
    analytics_log_event(
        "PaymentProcessed",
        order_id=event.order_id,
        transaction_id=event.transaction_id,
        amount=event.amount,
    )

    # 3. Fulfillment/side effects
    logger.info(
        f"[Fulfillment] Release order for fulfillment after payment {event.order_id}"
    )


async def handle_inventory_deduction(event):
    """Deduct inventory for products in the order when an order is created or paid."""
    db = (
        event.order._sa_instance_state.session
        if hasattr(event.order, "_sa_instance_state")
        else None
    )
    if not db:
        logging.error("No DB session found for inventory deduction.")
        return
    try:
        for item in getattr(event.order, "items", []):
            product_id = getattr(item, "product_id", None)
            quantity = getattr(item, "quantity", 1)
            if product_id:
                await db.execute(
                    update(Product)
                    .where(Product.id == product_id)
                    .values(inventory_quantity=Product.inventory_quantity - quantity)
                )
        await db.commit()
        logging.info(f"Inventory deducted for order {event.order.id}")
    except Exception as e:
        await db.rollback()
        logging.error(
            f"Inventory deduction failed for order {event.order.id}: {str(e)}"
        )


async def handle_fulfillment(event):
    """Simulate fulfillment workflow integration for shipping and delivery events."""
    if hasattr(event, "order_id"):
        if getattr(event, "event_type", None) == "ORDER_SHIPPED":
            logger.info(
                f"[Fulfillment] Order {event.order_id} shipped. Notifying warehouse/shipping provider."
            )
            # Simulate integration with fulfillment provider here
        elif getattr(event, "event_type", None) == "ORDER_DELIVERED":
            logger.info(
                f"[Fulfillment] Order {event.order_id} delivered. Completing fulfillment."
            )
            # Simulate post-delivery actions here


# Register the handlers
get_event_bus().subscribe("ORDER_CREATED", handle_order_created)
get_event_bus().subscribe("ORDER_STATUS_CHANGED", handle_order_status_changed)
get_event_bus().subscribe("ORDER_SHIPPED", handle_order_shipped)
get_event_bus().subscribe("ORDER_DELIVERED", handle_order_delivered)
get_event_bus().subscribe("ORDER_CANCELLED", handle_order_cancelled)
get_event_bus().subscribe("PAYMENT_PROCESSED", handle_payment_processed)
get_event_bus().subscribe("ORDER_CREATED", handle_inventory_deduction)
get_event_bus().subscribe("PAYMENT_PROCESSED", handle_inventory_deduction)
get_event_bus().subscribe("ORDER_SHIPPED", handle_fulfillment)
get_event_bus().subscribe("ORDER_DELIVERED", handle_fulfillment)

"""
Fulfillment Orchestration:
- Fulfillment steps (shipping, delivery) are triggered by events (ORDER_SHIPPED, ORDER_DELIVERED).
- The handle_fulfillment handler simulates integration with a fulfillment provider (e.g., warehouse, shipping API).
- To extend, implement real API calls or queue jobs in this handler.
"""
