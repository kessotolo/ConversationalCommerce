import logging
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from twilio.rest import Client

from backend.app.core.config.settings import get_settings
from backend.app.db.async_session import get_async_session_local
from backend.app.models.tenant import Tenant

settings = get_settings()
logger = logging.getLogger(__name__)


class NotificationChannel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    IN_APP = "in_app"


class NotificationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class Notification(BaseModel):
    id: str
    tenant_id: str
    user_id: str
    title: str
    message: str
    priority: NotificationPriority
    channels: List[NotificationChannel]
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    sent_at: Optional[datetime] = None
    status: str = "pending"


class NotificationService:
    def __init__(self):
        self.twilio_client = None
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            self.twilio_client = Client(
                settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN
            )

    async def send_notification(self, notification: Notification) -> bool:
        """Send a notification through all specified channels"""
        success = True
        for channel in notification.channels:
            try:
                if channel == NotificationChannel.EMAIL:
                    await self._send_email(notification)
                elif channel == NotificationChannel.SMS:
                    await self._send_sms(notification)
                elif channel == NotificationChannel.IN_APP:
                    await self._send_in_app(notification)
            except Exception as e:
                logger.error(f"Error sending {channel} notification: {str(e)}")
                success = False

        # Update notification status
        notification.status = "sent" if success else "failed"
        notification.sent_at = datetime.now(timezone.utc)

        return success

    async def _send_email(self, notification: Notification) -> None:
        """Send email notification"""
        if not settings.SMTP_HOST or not settings.SMTP_PORT:
            raise ValueError("SMTP settings not configured")

        # Get tenant email settings
        db = get_async_session_local()
        try:
            tenant = await db.get(Tenant, notification.tenant_id)
            if not tenant or not tenant.notification_email:
                raise ValueError("Tenant email not configured")

            msg = MIMEMultipart()
            msg["From"] = settings.SMTP_FROM_EMAIL
            msg["To"] = tenant.notification_email
            msg["Subject"] = f"[{notification.priority.upper()}] {notification.title}"

            body = f"""
            Priority: {notification.priority}
            Time: {notification.created_at}

            {notification.message}

            Additional Information:
            {self._format_metadata(notification.metadata)}
            """

            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    server.starttls()
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)

        finally:
            await db.close()

    async def _send_sms(self, notification: Notification) -> None:
        """Send SMS notification using Twilio"""
        if not self.twilio_client:
            raise ValueError("Twilio client not configured")

        # Get tenant phone settings
        db = get_async_session_local()
        try:
            tenant = await db.get(Tenant, notification.tenant_id)
            if not tenant or not tenant.notification_phone:
                raise ValueError("Tenant phone not configured")

            message = self.twilio_client.messages.create(
                body=f"[{notification.priority.upper()}] {notification.title}\n\n{notification.message}",
                from_=settings.TWILIO_PHONE_NUMBER,
                to=tenant.notification_phone,
            )
            logger.info(f"SMS sent: {message.sid}")

        finally:
            await db.close()

    async def _send_in_app(self, notification: Notification) -> None:
        """Send in-app notification through WebSocket"""
        # This will be handled by the WebSocket service
        # The notification will be broadcast to all connected clients for the tenant
        from backend.app.core.websocket.monitoring import connection_manager

        await connection_manager.broadcast_to_tenant(
            notification.tenant_id,
            {"type": "notification", "data": notification.dict()},
        )

    def _format_metadata(self, metadata: Dict[str, Any]) -> str:
        """Format metadata for display in notifications"""
        return "\n".join(f"{k}: {v}" for k, v in metadata.items())


# Create global instance
notification_service = NotificationService()
