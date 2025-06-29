from app.core.celery_app import celery_app
from app.core.notifications.notification_service import NotificationService, Notification
import logging


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
        # TODO: Integrate with real fulfillment provider here
        logging.info(f"[Fulfillment] Handling fulfillment: {fulfillment_data}")
    except Exception as exc:
        logging.error(f"Fulfillment failed: {exc}. Retrying...")
        raise self.retry(exc=exc)
