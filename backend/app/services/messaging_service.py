from app.app.services.audit_service import create_audit_log
from app.app.models.order import Order, OrderStatus
import logging
from uuid import UUID

from sqlalchemy.orm import Session
from twilio.rest import Client

from app.app.core.config.settings import get_settings
settings = get_settings()


logger = logging.getLogger(__name__)

# Initialize Twilio client if credentials are available
twilio_client = None
try:
    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
        twilio_client = Client(settings.TWILIO_ACCOUNT_SID,
                               settings.TWILIO_AUTH_TOKEN)
except Exception as e:
    logger.error(f"Failed to initialize Twilio client: {str(e)}")


def send_order_status_notification(db: Session, order: Order, seller_id: UUID) -> bool:
    """
    Send a WhatsApp notification to the customer about their order status
    Returns True if the message was sent successfully
    """
    if not twilio_client or not settings.TWILIO_WHATSAPP_FROM:
        logger.warning("Twilio not configured, skipping notification")
        return False

    if not order.whatsapp_number:
        logger.warning(
            f"Order {order.id} has no WhatsApp number, skipping notification"
        )
        return False

    try:
        # Format the message based on order status
        message_body = _get_status_message(order)

        # Send the message
        message = twilio_client.messages.create(
            body=message_body,
            from_=f"whatsapp:{settings.TWILIO_WHATSAPP_FROM}",
            to=f"whatsapp:{order.whatsapp_number}",
        )

        # Log the successful notification
        create_audit_log(
            db=db,
            user_id=seller_id,
            action="notification",
            resource_type="Order",
            resource_id=str(order.id),
            details=f"Sent status notification: {order.status.value}",
        )

        logger.info(
            f"Sent WhatsApp notification for order {order.id}, SID: {message.sid}"
        )
        return True

    except Exception as e:
        logger.error(
            f"Failed to send WhatsApp notification for order {order.id}: {str(e)}"
        )
        return False


def send_order_confirmation(db: Session, order: Order, seller_id: UUID) -> bool:
    """
    Send an order confirmation message to the customer
    """
    if not twilio_client or not settings.TWILIO_WHATSAPP_FROM:
        logger.warning("Twilio not configured, skipping confirmation")
        return False

    if not order.whatsapp_number:
        logger.warning(
            f"Order {order.id} has no WhatsApp number, skipping confirmation"
        )
        return False

    try:
        # Format the confirmation message
        message_body = f"""
Thank you for your order!

Order details:
- Order ID: {order.id}
- Product: {order.product_id}
- Quantity: {order.quantity}
- Total: {order.total_amount}

We'll update you on your order status. If you have any questions, please reply to this message.
"""

        # Send the message
        message = twilio_client.messages.create(
            body=message_body,
            from_=f"whatsapp:{settings.TWILIO_WHATSAPP_FROM}",
            to=f"whatsapp:{order.whatsapp_number}",
        )

        # Log the successful notification
        create_audit_log(
            db=db,
            user_id=seller_id,
            action="notification",
            resource_type="Order",
            resource_id=str(order.id),
            details="Sent order confirmation",
        )

        logger.info(
            f"Sent order confirmation for order {order.id}, SID: {message.sid}")
        return True

    except Exception as e:
        logger.error(
            f"Failed to send order confirmation for order {order.id}: {str(e)}"
        )
        return False


def _get_status_message(order: Order) -> str:
    """
    Get the appropriate message text based on order status
    """
    base_message = f"Order update: Your order #{order.id} "

    if order.status == OrderStatus.confirmed:
        return base_message + "has been confirmed and is being processed."

    elif order.status == OrderStatus.processing:
        return base_message + "is now being processed and prepared for shipping."

    elif order.status == OrderStatus.shipped:
        tracking_info = ""
        if order.tracking_number and order.shipping_carrier:
            tracking_info = f" Your tracking number is {order.tracking_number} with {order.shipping_carrier}."
        return base_message + "has been shipped." + tracking_info

    elif order.status == OrderStatus.delivered:
        return base_message + "has been delivered. Thank you for your business!"

    elif order.status == OrderStatus.cancelled:
        return (
            base_message
            + "has been cancelled. Please contact us if you have any questions."
        )

    else:  # Default for pending or any other status
        return base_message + f"status is now: {order.status.value}"


def send_seller_notification(phone_number: str, message: str) -> bool:
    """
    Send a notification to the seller
    """
    if not twilio_client or not settings.TWILIO_WHATSAPP_FROM:
        logger.warning("Twilio not configured, skipping seller notification")
        return False

    try:
        # Send the message
        message = twilio_client.messages.create(
            body=message,
            from_=f"whatsapp:{settings.TWILIO_WHATSAPP_FROM}",
            to=f"whatsapp:{phone_number}",
        )

        logger.info(f"Sent seller notification, SID: {message.sid}")
        return True

    except Exception as e:
        logger.error(f"Failed to send seller notification: {str(e)}")
        return False
