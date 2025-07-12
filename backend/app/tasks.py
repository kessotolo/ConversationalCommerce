from backend.app.core.celery_app import celery_app
from backend.app.core.notifications.notification_service import NotificationService, Notification
from backend.app.services.fulfillment.fulfillment_service import FulfillmentService
from backend.app.services.fulfillment.providers.base import FulfillmentProvider
from backend.app.services.fulfillment.providers.shipping import ShippingProvider
from backend.app.services.fulfillment.providers.delivery import DeliveryProvider
import logging
import asyncio


@celery_app.task(bind=True, max_retries=5, default_retry_delay=30)
def send_notification_task(self, notification_data: dict):
    """Celery task to send a notification with retries."""
    try:
        service = NotificationService()
        notification = Notification(**notification_data)
        service.send_notification(notification)
    except Exception as exc:
        logging.error(f"Notification send failed: {exc}. Retrying...")
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=5, default_retry_delay=60)
def handle_fulfillment_task(self, fulfillment_data: dict):
    """Celery task to handle fulfillment integration (shipping, delivery, etc)."""
    try:
        # Initialize fulfillment service
        fulfillment_service = FulfillmentService()

        # Extract fulfillment details
        order_id = fulfillment_data.get("order_id")
        fulfillment_type = fulfillment_data.get("type", "shipping")
        provider_name = fulfillment_data.get("provider", "default")
        tracking_info = fulfillment_data.get("tracking_info", {})

        logging.info(
            f"[Fulfillment] Processing {fulfillment_type} for order {order_id}")

        # Handle different fulfillment types using asyncio.run for async operations
        if fulfillment_type == "shipping":
            result = asyncio.run(fulfillment_service.process_shipping(
                order_id=order_id,
                provider_name=provider_name,
                tracking_info=tracking_info
            ))
        elif fulfillment_type == "delivery":
            result = asyncio.run(fulfillment_service.process_delivery(
                order_id=order_id,
                provider_name=provider_name,
                tracking_info=tracking_info
            ))
        elif fulfillment_type == "pickup":
            result = asyncio.run(fulfillment_service.process_pickup(
                order_id=order_id,
                provider_name=provider_name,
                pickup_info=fulfillment_data.get("pickup_info", {})
            ))
        else:
            raise ValueError(
                f"Unsupported fulfillment type: {fulfillment_type}")

        logging.info(
            f"[Fulfillment] Successfully processed {fulfillment_type} for order {order_id}")
        return result

    except Exception as exc:
        logging.error(
            f"Fulfillment failed for order {fulfillment_data.get('order_id', 'unknown')}: {exc}. Retrying...")
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=120)
def update_fulfillment_status_task(self, tracking_id: str, provider_name: str):
    """Celery task to update fulfillment status from provider."""
    try:
        fulfillment_service = FulfillmentService()

        logging.info(
            f"[Fulfillment] Updating status for tracking {tracking_id} with provider {provider_name}")

        # Update status from provider using asyncio.run
        status_update = asyncio.run(fulfillment_service.update_tracking_status(
            tracking_id=tracking_id,
            provider_name=provider_name
        ))

        logging.info(
            f"[Fulfillment] Updated status for tracking {tracking_id}: {status_update}")
        return status_update

    except Exception as exc:
        logging.error(
            f"Fulfillment status update failed for tracking {tracking_id}: {exc}. Retrying...")
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=300)
def notify_fulfillment_update_task(self, order_id: str, status_update: dict):
    """Celery task to notify about fulfillment status updates."""
    try:
        from backend.app.core.notifications.unified_notification_system import UnifiedNotificationSystem

        notification_system = UnifiedNotificationSystem()

        # Create notification for fulfillment update
        title = f"Order {order_id} Fulfillment Update"
        message = f"Your order {order_id} has been updated: {status_update.get('status', 'Unknown')}"

        if status_update.get("tracking_number"):
            message += f"\nTracking: {status_update['tracking_number']}"

        if status_update.get("estimated_delivery"):
            message += f"\nEstimated delivery: {status_update['estimated_delivery']}"

        # Send notification to customer using asyncio.run
        asyncio.run(notification_system.send_tenant_notification(
            tenant_id=status_update.get("tenant_id"),
            title=title,
            message=message,
            category="fulfillment_update",
            priority="medium",
            user_id=status_update.get("customer_id"),
            channels=["in_app", "email"]
        ))

        logging.info(f"[Fulfillment] Sent notification for order {order_id}")

    except Exception as exc:
        logging.error(
            f"Fulfillment notification failed for order {order_id}: {exc}. Retrying...")
        raise self.retry(exc=exc)
