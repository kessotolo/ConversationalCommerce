import logging
from app.domain.events.order_events import (
    OrderCreatedEvent,
    OrderStatusChangedEvent,
    OrderShippedEvent,
    OrderDeliveredEvent,
    OrderCancelledEvent,
    PaymentProcessedEvent
)
from app.domain.events.event_bus import get_event_bus
from app.core.notifications.notification_service import NotificationService, Notification, NotificationChannel

logger = logging.getLogger(__name__)


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
        metadata={"order_id": event.order_id}
    )
    service = NotificationService()
    await service.send_notification(notification)

    # 2. Log analytics (placeholder: log to logger)
    logger.info(
        f"[Analytics] Order created: {event.order_id} value={event.order.total_amount.amount} currency={event.order.total_amount.currency}")

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
        metadata={"order_id": event.order_id, "new_status": event.new_status}
    )
    service = NotificationService()
    await service.send_notification(notification)

    # 2. Log analytics
    logger.info(
        f"[Analytics] Order status changed: {event.order_id} {event.previous_status} → {event.new_status}")

    # 3. Fulfillment/side effects
    logger.info(
        f"[Fulfillment] Handle status change for order {event.order_id} to {event.new_status}")


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
                  "tracking_number": event.tracking_number}
    )
    service = NotificationService()
    await service.send_notification(notification)

    # 2. Log analytics
    logger.info(
        f"[Analytics] Order shipped: {event.order_id} tracking={event.tracking_number}")

    # 3. Fulfillment/side effects
    logger.info(
        f"[Fulfillment] Notify warehouse/shipping provider for order {event.order_id}")


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
        metadata={"order_id": event.order_id,
                  "delivery_date": str(event.delivery_date)}
    )
    service = NotificationService()
    await service.send_notification(notification)

    # 2. Log analytics
    logger.info(
        f"[Analytics] Order delivered: {event.order_id} delivered_at={event.delivery_date}")

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
                  "reason": event.cancellation_reason}
    )
    service = NotificationService()
    await service.send_notification(notification)

    # 2. Log analytics
    logger.info(
        f"[Analytics] Order cancelled: {event.order_id} reason={event.cancellation_reason}")

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
                  "transaction_id": event.transaction_id}
    )
    service = NotificationService()
    await service.send_notification(notification)

    # 2. Log analytics
    logger.info(
        f"[Analytics] Payment processed: {event.order_id} transaction_id={event.transaction_id} amount={event.amount}")

    # 3. Fulfillment/side effects
    logger.info(
        f"[Fulfillment] Release order for fulfillment after payment {event.order_id}")

# Register the handlers
get_event_bus().subscribe('ORDER_CREATED', handle_order_created)
get_event_bus().subscribe('ORDER_STATUS_CHANGED', handle_order_status_changed)
get_event_bus().subscribe('ORDER_SHIPPED', handle_order_shipped)
get_event_bus().subscribe('ORDER_DELIVERED', handle_order_delivered)
get_event_bus().subscribe('ORDER_CANCELLED', handle_order_cancelled)
get_event_bus().subscribe('PAYMENT_PROCESSED', handle_payment_processed)
