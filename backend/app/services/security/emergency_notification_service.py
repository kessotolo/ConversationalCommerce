"""
Emergency notification service.

This module handles the creation and sending of notifications
to emergency contacts when security events occur.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple

from sqlalchemy import select, update, and_, or_, not_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.app.models.security.emergency import (
    EmergencyEvent, EmergencySeverity, EmergencyType,
    EmergencyNotification, EmergencyContact, NotificationChannel
)
from app.app.services.audit.audit_service import AuditService


class EmergencyNotificationService:
    """Service for managing emergency notifications."""

    def __init__(self):
        self.audit_service = AuditService()

    async def create_emergency_contact(
        self,
        db: AsyncSession,
        name: str,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None,
        notify_via_email: bool = True,
        notify_via_sms: bool = False,
        additional_channels: Optional[Dict[str, Any]] = None,
        tenant_id: Optional[uuid.UUID] = None,
        min_severity: EmergencySeverity = EmergencySeverity.HIGH,
        notify_for_types: Optional[List[str]] = None,
        admin_user_id: Optional[uuid.UUID] = None
    ) -> EmergencyContact:
        """
        Create a new emergency contact.

        Args:
            db: Database session
            name: Name of the contact
            email: Email address
            phone: Phone number
            user_id: ID of associated user (if internal)
            notify_via_email: Whether to notify via email
            notify_via_sms: Whether to notify via SMS
            additional_channels: Additional notification channels
            tenant_id: ID of the tenant (null for platform-wide)
            min_severity: Minimum severity to notify about
            notify_for_types: Types of emergencies to notify for
            admin_user_id: ID of admin creating the contact

        Returns:
            The created emergency contact
        """
        # Validate inputs
        if not email and not phone:
            raise ValueError("At least one of email or phone must be provided")

        if not notify_via_email and not notify_via_sms and not additional_channels:
            raise ValueError(
                "At least one notification channel must be enabled")

        # Create contact
        contact = EmergencyContact(
            name=name,
            email=email,
            phone=phone,
            user_id=user_id,
            notify_via_email=notify_via_email,
            notify_via_sms=notify_via_sms,
            additional_channels=additional_channels,
            tenant_id=tenant_id,
            min_severity=min_severity,
            notify_for_types=notify_for_types,
            is_active=True
        )

        db.add(contact)
        await db.commit()
        await db.refresh(contact)

        # Log audit event
        if admin_user_id:
            await self.audit_service.log_event(
                db=db,
                user_id=admin_user_id,
                action="emergency_contact_created",
                resource_type="emergency_contact",
                resource_id=str(contact.id),
                tenant_id=tenant_id,
                status="success",
                details={
                    "name": name,
                    "scope": "platform-wide" if tenant_id is None else "tenant-specific",
                    "min_severity": min_severity
                }
            )

        return contact

    async def update_emergency_contact(
        self,
        db: AsyncSession,
        contact_id: uuid.UUID,
        name: Optional[str] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        notify_via_email: Optional[bool] = None,
        notify_via_sms: Optional[bool] = None,
        additional_channels: Optional[Dict[str, Any]] = None,
        min_severity: Optional[EmergencySeverity] = None,
        notify_for_types: Optional[List[str]] = None,
        is_active: Optional[bool] = None,
        admin_user_id: Optional[uuid.UUID] = None
    ) -> EmergencyContact:
        """
        Update an existing emergency contact.

        Args:
            db: Database session
            contact_id: ID of the contact to update
            name: New name
            email: New email
            phone: New phone
            notify_via_email: Whether to notify via email
            notify_via_sms: Whether to notify via SMS
            additional_channels: Additional notification channels
            min_severity: Minimum severity to notify about
            notify_for_types: Types of emergencies to notify for
            is_active: Whether the contact is active
            admin_user_id: ID of admin updating the contact

        Returns:
            The updated emergency contact
        """
        # Get the contact
        query = select(EmergencyContact).where(
            EmergencyContact.id == contact_id)
        result = await db.execute(query)
        contact = result.scalars().first()

        if not contact:
            raise ValueError(f"Emergency contact {contact_id} not found")

        # Update fields
        if name is not None:
            contact.name = name

        if email is not None:
            contact.email = email

        if phone is not None:
            contact.phone = phone

        if notify_via_email is not None:
            contact.notify_via_email = notify_via_email

        if notify_via_sms is not None:
            contact.notify_via_sms = notify_via_sms

        if additional_channels is not None:
            contact.additional_channels = additional_channels

        if min_severity is not None:
            contact.min_severity = min_severity

        if notify_for_types is not None:
            contact.notify_for_types = notify_for_types

        if is_active is not None:
            contact.is_active = is_active

        # Validate that at least one notification channel is enabled
        if not contact.notify_via_email and not contact.notify_via_sms and not contact.additional_channels:
            raise ValueError(
                "At least one notification channel must be enabled")

        await db.commit()
        await db.refresh(contact)

        # Log audit event
        if admin_user_id:
            await self.audit_service.log_event(
                db=db,
                user_id=admin_user_id,
                action="emergency_contact_updated",
                resource_type="emergency_contact",
                resource_id=str(contact.id),
                tenant_id=contact.tenant_id,
                status="success",
                details={
                    "name": contact.name,
                    "is_active": contact.is_active,
                    "min_severity": contact.min_severity
                }
            )

        return contact

    async def send_emergency_notification(
        self,
        db: AsyncSession,
        emergency_id: uuid.UUID,
        subject: str,
        message: str,
        user_id: Optional[uuid.UUID] = None
    ) -> List[EmergencyNotification]:
        """
        Send notifications to appropriate emergency contacts for an emergency.

        Args:
            db: Database session
            emergency_id: ID of the emergency event
            subject: Subject of the notification
            message: Body of the notification
            user_id: ID of user triggering the notification

        Returns:
            List of created notification records
        """
        # Get the emergency event
        event_query = select(EmergencyEvent).where(
            EmergencyEvent.id == emergency_id)
        result = await db.execute(event_query)
        event = result.scalars().first()

        if not event:
            raise ValueError(f"Emergency event {emergency_id} not found")

        # Find eligible contacts based on severity and affected tenants
        contacts_query = select(EmergencyContact).where(
            and_(
                EmergencyContact.is_active == True,
                # Match severity level
                EmergencyContact.min_severity <= event.severity
            )
        )

        # Filter by emergency type if specified
        if event.type and event.type != EmergencyType.OTHER:
            contacts_query = contacts_query.where(
                or_(
                    EmergencyContact.notify_for_types == None,  # Null means all types
                    EmergencyContact.notify_for_types.contains([event.type])
                )
            )

        # Handle tenant-specific notifications
        tenant_conditions = []

        # Platform-wide contacts
        tenant_conditions.append(EmergencyContact.tenant_id == None)

        # Tenant-specific contacts for affected tenants
        if event.affected_tenants:
            for tenant_id in event.affected_tenants:
                tenant_conditions.append(
                    EmergencyContact.tenant_id == tenant_id)

        contacts_query = contacts_query.where(or_(*tenant_conditions))

        # Execute query
        result = await db.execute(contacts_query)
        contacts = result.scalars().all()

        # Send notifications
        notifications = []
        for contact in contacts:
            # Create notifications for each enabled channel
            if contact.notify_via_email and contact.email:
                notification = await self._create_notification(
                    db=db,
                    emergency_id=emergency_id,
                    contact=contact,
                    channel=NotificationChannel.EMAIL,
                    subject=subject,
                    message=message,
                    recipient_email=contact.email
                )
                notifications.append(notification)

            if contact.notify_via_sms and contact.phone:
                notification = await self._create_notification(
                    db=db,
                    emergency_id=emergency_id,
                    contact=contact,
                    channel=NotificationChannel.SMS,
                    subject=subject,
                    message=message,
                    recipient_phone=contact.phone
                )
                notifications.append(notification)

            if contact.additional_channels:
                for channel_name, config in contact.additional_channels.items():
                    try:
                        channel_enum = NotificationChannel(
                            channel_name.lower())
                        notification = await self._create_notification(
                            db=db,
                            emergency_id=emergency_id,
                            contact=contact,
                            channel=channel_enum,
                            subject=subject,
                            message=message,
                            details=config
                        )
                        notifications.append(notification)
                    except ValueError:
                        # Invalid channel name, skip
                        continue

        # Log audit event
        if user_id:
            await self.audit_service.log_event(
                db=db,
                user_id=user_id,
                action="emergency_notifications_sent",
                resource_type="emergency_event",
                resource_id=str(emergency_id),
                status="success",
                details={
                    "notification_count": len(notifications),
                    "emergency_type": event.type,
                    "emergency_severity": event.severity
                }
            )

        return notifications

    async def _create_notification(
        self,
        db: AsyncSession,
        emergency_id: uuid.UUID,
        contact: EmergencyContact,
        channel: NotificationChannel,
        subject: str,
        message: str,
        recipient_email: Optional[str] = None,
        recipient_phone: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> EmergencyNotification:
        """
        Create a notification record and dispatch it through the specified channel.

        Args:
            db: Database session
            emergency_id: ID of the emergency event
            contact: The emergency contact
            channel: The notification channel
            subject: Subject of the notification
            message: Body of the notification
            recipient_email: Email recipient
            recipient_phone: Phone recipient
            details: Additional details for the notification

        Returns:
            The created notification record
        """
        # Create notification record
        notification = EmergencyNotification(
            emergency_id=emergency_id,
            recipient_user_id=contact.user_id,
            recipient_email=recipient_email,
            recipient_phone=recipient_phone,
            recipient_channel=channel,
            subject=subject,
            message=message,
            sent_at=datetime.now(timezone.utc),
            details=details
        )

        db.add(notification)
        await db.commit()
        await db.refresh(notification)

        # Dispatch the notification through appropriate service
        try:
            if channel == NotificationChannel.EMAIL and recipient_email:
                await self._dispatch_email_notification(
                    recipient_email=recipient_email,
                    subject=subject,
                    message=message,
                    notification_id=notification.id
                )
                notification.delivered = True

            elif channel == NotificationChannel.SMS and recipient_phone:
                await self._dispatch_sms_notification(
                    recipient_phone=recipient_phone,
                    message=message,
                    notification_id=notification.id
                )
                notification.delivered = True

            elif channel == NotificationChannel.SLACK:
                await self._dispatch_slack_notification(
                    webhook_url=details.get(
                        "webhook_url") if details else None,
                    channel=details.get("channel") if details else None,
                    message=message,
                    notification_id=notification.id
                )
                notification.delivered = True

            elif channel == NotificationChannel.WEBHOOK:
                await self._dispatch_webhook_notification(
                    webhook_url=details.get(
                        "webhook_url") if details else None,
                    payload=details.get("payload") if details else None,
                    notification_id=notification.id
                )
                notification.delivered = True

            else:
                # Unsupported channel or missing recipient
                notification.delivered = False
                notification.error_message = f"Unsupported channel {channel} or missing recipient"

        except Exception as e:
            notification.delivered = False
            notification.error_message = str(e)
            # logger.error(f"Failed to dispatch notification {notification.id}: {str(e)}") # Original code had this line commented out

        await db.commit()
        await db.refresh(notification)

        return notification

    async def _dispatch_email_notification(
        self,
        recipient_email: str,
        subject: str,
        message: str,
        notification_id: uuid.UUID
    ) -> None:
        """Dispatch email notification."""
        try:
            from app.app.core.notifications.email_service import EmailService

            email_service = EmailService()
            await email_service.send_emergency_email(
                to_email=recipient_email,
                subject=subject,
                message=message
            )

            # logger.info(f"Emergency email sent to {recipient_email} for notification {notification_id}") # Original code had this line commented out

        except Exception as e:
            # logger.error(f"Failed to send emergency email to {recipient_email}: {str(e)}") # Original code had this line commented out
            raise

    async def _dispatch_sms_notification(
        self,
        recipient_phone: str,
        message: str,
        notification_id: uuid.UUID
    ) -> None:
        """Dispatch SMS notification."""
        try:
            from app.app.core.notifications.sms_service import SMSService

            sms_service = SMSService()
            await sms_service.send_emergency_sms(
                to_phone=recipient_phone,
                message=message
            )

            # logger.info(f"Emergency SMS sent to {recipient_phone} for notification {notification_id}") # Original code had this line commented out

        except Exception as e:
            # logger.error(f"Failed to send emergency SMS to {recipient_phone}: {str(e)}") # Original code had this line commented out
            raise

    async def _dispatch_slack_notification(
        self,
        webhook_url: Optional[str],
        channel: Optional[str],
        message: str,
        notification_id: uuid.UUID
    ) -> None:
        """Dispatch Slack notification."""
        try:
            from app.app.core.notifications.slack_service import SlackService

            slack_service = SlackService()
            await slack_service.send_emergency_message(
                webhook_url=webhook_url,
                channel=channel,
                message=message
            )

            # logger.info(f"Emergency Slack message sent for notification {notification_id}") # Original code had this line commented out

        except Exception as e:
            # logger.error(f"Failed to send emergency Slack message: {str(e)}") # Original code had this line commented out
            raise

    async def _dispatch_webhook_notification(
        self,
        webhook_url: Optional[str],
        payload: Optional[Dict[str, Any]],
        notification_id: uuid.UUID
    ) -> None:
        """Dispatch webhook notification."""
        try:
            from app.app.core.notifications.webhook_service import WebhookService

            webhook_service = WebhookService()
            await webhook_service.send_emergency_webhook(
                webhook_url=webhook_url,
                payload=payload or {}
            )

            # logger.info(f"Emergency webhook sent for notification {notification_id}") # Original code had this line commented out

        except Exception as e:
            # logger.error(f"Failed to send emergency webhook: {str(e)}") # Original code had this line commented out
            raise

    async def mark_notification_acknowledged(
        self,
        db: AsyncSession,
        notification_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None
    ) -> EmergencyNotification:
        """
        Mark a notification as acknowledged by a recipient.

        Args:
            db: Database session
            notification_id: ID of the notification
            user_id: ID of user acknowledging the notification

        Returns:
            The updated notification
        """
        # Get the notification
        query = select(EmergencyNotification).where(
            EmergencyNotification.id == notification_id)
        result = await db.execute(query)
        notification = result.scalars().first()

        if not notification:
            raise ValueError(f"Notification {notification_id} not found")

        # Update the notification
        notification.acknowledged_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(notification)

        # Log audit event
        if user_id:
            await self.audit_service.log_event(
                db=db,
                user_id=user_id,
                action="emergency_notification_acknowledged",
                resource_type="emergency_notification",
                resource_id=str(notification.id),
                status="success",
                details={
                    "emergency_id": str(notification.emergency_id),
                    "channel": notification.recipient_channel
                }
            )

        return notification

    async def get_emergency_contacts(
        self,
        db: AsyncSession,
        tenant_id: Optional[uuid.UUID] = None,
        include_inactive: bool = False
    ) -> List[EmergencyContact]:
        """
        Get emergency contacts, optionally filtered by tenant.

        Args:
            db: Database session
            tenant_id: Optional tenant ID to filter by
            include_inactive: Whether to include inactive contacts

        Returns:
            List of emergency contacts
        """
        query = select(EmergencyContact)

        if not include_inactive:
            query = query.where(EmergencyContact.is_active == True)

        # Filter by tenant if specified
        if tenant_id:
            query = query.where(
                or_(
                    EmergencyContact.tenant_id == None,  # Platform-wide contacts
                    EmergencyContact.tenant_id == tenant_id  # Tenant-specific contacts
                )
            )

        # Sort by tenant (platform-wide first), then by severity (highest first)
        query = query.order_by(
            EmergencyContact.tenant_id.nullsfirst(),
            EmergencyContact.min_severity.asc()  # Lower severity value = higher severity
        )

        result = await db.execute(query)
        return result.scalars().all()
