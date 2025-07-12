"""
Admin Notification Integration

This module integrates the unified notification system with admin services,
providing specialized notification utilities for admin operations and cross-tenant
communication.
"""

import logging
from typing import List, Dict, Any, Optional, Union
from datetime import datetime

from backend.app.core.notifications.unified_notification_system import (
    UnifiedNotificationSystem,
    NotificationCategory,
    NotificationPriority,
    RecipientType,
    NotificationChannel,
    NotificationDeliveryStatus
)
from backend.app.core.cache.redis_cache import cache_response
from backend.app.db.session import get_db
from backend.app.core.config.settings import get_settings
from backend.app.services.admin.admin_user.service import get_admin_by_id, get_admins_by_role
from backend.app.services.admin.admin_user.roles import AdminRole
from backend.app.services.admin.admin_user.models import AdminUser
from backend.app.core.telemetry import trace_operation
from backend.app.core.exceptions import NotificationDeliveryError
from backend.app.models.tenant import Tenant

# Set up logger
logger = logging.getLogger(__name__)


class AdminNotificationService:
    """
    Service for handling admin-specific notifications and integrating with
    the unified notification system.
    """

    def __init__(self):
        try:
            self.notification_system = UnifiedNotificationSystem()
        except Exception as e:
            logger.error(f"Failed to initialize notification system: {e}")
            # Fallback to a basic notification system if the unified one fails
            self.notification_system = None

    @trace_operation("admin_notification.notify_all_admins")
    async def notify_all_admins(
        self,
        title: str,
        message: str,
        category: NotificationCategory = NotificationCategory.SYSTEM,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        channels: List[NotificationChannel] = [NotificationChannel.IN_APP],
        link: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Send notification to all admin users.

        Args:
            title: Notification title
            message: Notification message
            category: Notification category
            priority: Notification priority
            channels: List of notification channels to use
            link: Optional link to include
            metadata: Optional additional metadata

        Returns:
            Notification ID
        """
        logger.info(f"Sending notification to all admins: {title}")

        # Validate notification system is available
        if not self.notification_system:
            error_msg = "Notification system unavailable"
            logger.error(error_msg)
            raise NotificationDeliveryError(error_msg)

        try:
            # Get all admin users
            async with get_db() as db:
                admin_roles = [
                    role for role in AdminRole if role != AdminRole.CUSTOM]
                admins_by_role = {}

                for role in admin_roles:
                    admins_by_role[role] = await get_admins_by_role(db, role)

            # Combine all admin IDs
            admin_ids = []
            for role, admins in admins_by_role.items():
                admin_ids.extend([admin.id for admin in admins])

            if not admin_ids:
                logger.warning("No admin recipients found for notification")
                return "no_recipients"

            # Create notification for all admins
            notification_id = await self.notification_system.create_notification(
                title=title,
                body=message,
                category=category,
                priority=priority,
                recipient_type=RecipientType.ADMIN,
                recipient_ids=admin_ids,
                channels=channels,
                link=link,
                metadata=metadata or {}
            )

            # Log successful notification
            logger.info(
                f"Notification sent to {len(admin_ids)} admins: {notification_id}")
            return notification_id
        except Exception as e:
            error_msg = f"Failed to send notification to admins: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise NotificationDeliveryError(error_msg) from e

    @trace_operation("admin_notification.notify_admins_by_role")
    async def notify_admins_by_role(
        self,
        roles: List[AdminRole],
        title: str,
        message: str,
        category: NotificationCategory = NotificationCategory.SYSTEM,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        channels: List[NotificationChannel] = [NotificationChannel.IN_APP],
        link: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Send notification to admins with specific roles.

        Args:
            roles: List of admin roles to notify
            title: Notification title
            message: Notification message
            category: Notification category
            priority: Notification priority
            channels: List of notification channels to use
            link: Optional link to include
            metadata: Optional additional metadata

        Returns:
            Notification ID
        """
        logger.info(
            f"Sending notification to admins with roles {roles}: {title}")

        # Get admin users by roles
        db = next(get_db())
        admin_ids = []

        for role in roles:
            admins = get_admins_by_role(db, role)
            admin_ids.extend([admin.id for admin in admins])

        # Create notification for specified admins
        notification_id = self.notification_system.create_notification(
            title=title,
            body=message,
            category=category,
            priority=priority,
            recipient_type=RecipientType.ADMIN,
            recipient_ids=admin_ids,
            channels=channels,
            link=link,
            metadata=metadata or {}
        )

        return notification_id

    @trace_operation("admin_notification.notify_tenant_admins")
    async def notify_tenant_admins(
        self,
        tenant_id: str,
        title: str,
        message: str,
        category: NotificationCategory = NotificationCategory.TENANT,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        channels: List[NotificationChannel] = [NotificationChannel.IN_APP],
        link: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Send notification to all admin users and tenant administrators.

        Args:
            tenant_id: ID of the tenant
            title: Notification title
            message: Notification message
            category: Notification category
            priority: Notification priority
            channels: List of notification channels to use
            link: Optional link to include
            metadata: Optional additional metadata

        Returns:
            Notification ID
        """
        logger.info(
            f"Sending notification to tenant {tenant_id} administrators: {title}")

        # Get all tenant administrators and all system admins
        db = next(get_db())

        # Get tenant admin users
        from backend.app.services.tenant.user_service import get_tenant_admins
        tenant_admins = get_tenant_admins(db, tenant_id)
        tenant_admin_ids = [admin.id for admin in tenant_admins]

        # Get system admin users
        system_admins = get_admins_by_role(db, AdminRole.SYSTEM_ADMIN)
        system_admin_ids = [admin.id for admin in system_admins]

        # Create notification for both tenant admins and system admins
        notification_id = self.notification_system.create_notification(
            title=title,
            body=message,
            category=category,
            priority=priority,
            recipient_type=RecipientType.MIXED,
            recipient_ids={
                RecipientType.TENANT: tenant_admin_ids,
                RecipientType.ADMIN: system_admin_ids
            },
            channels=channels,
            link=link,
            metadata={
                "tenant_id": tenant_id,
                **(metadata or {})
            }
        )

        return notification_id

    def send_system_alert(
        self,
        alert_type: str,
        message: str,
        affected_component: str,
        severity: str = "medium",
        additional_info: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Send system alert notification to appropriate admin roles based on alert type.

        Args:
            alert_type: Type of alert (security, performance, error, etc.)
            message: Alert message
            affected_component: System component affected
            severity: Alert severity (low, medium, high, critical)
            additional_info: Optional additional information

        Returns:
            Notification ID
        """
        logger.info(
            f"Sending system alert ({severity}): {alert_type} - {affected_component}")

        # Map severity to notification priority
        priority_map = {
            "low": NotificationPriority.LOW,
            "medium": NotificationPriority.NORMAL,
            "high": NotificationPriority.HIGH,
            "critical": NotificationPriority.CRITICAL
        }
        priority = priority_map.get(
            severity.lower(), NotificationPriority.NORMAL)

        # Determine which admin roles should receive this alert
        # Super admins always get alerts
        target_roles = [AdminRole.SUPER_ADMIN]

        if alert_type.lower() == "security":
            target_roles.append(AdminRole.SECURITY_ADMIN)
        elif alert_type.lower() in ["performance", "error", "system"]:
            target_roles.append(AdminRole.SYSTEM_ADMIN)
        elif alert_type.lower() == "tenant":
            target_roles.extend(
                [AdminRole.SYSTEM_ADMIN, AdminRole.SUPPORT_ADMIN])

        # Create alert title
        title = f"{severity.upper()} {alert_type} Alert: {affected_component}"

        # Determine channels based on severity
        channels = [NotificationChannel.IN_APP]
        if severity.lower() in ["high", "critical"]:
            channels.append(NotificationChannel.EMAIL)
            if severity.lower() == "critical":
                channels.append(NotificationChannel.SMS)

        # Send notification
        return self.notify_admins_by_role(
            roles=target_roles,
            title=title,
            message=message,
            category=NotificationCategory.ALERT,
            priority=priority,
            channels=channels,
            metadata={
                "alert_type": alert_type,
                "affected_component": affected_component,
                "severity": severity,
                "timestamp": datetime.utcnow().isoformat(),
                **(additional_info or {})
            }
        )

    def send_task_notification(
        self,
        task_id: str,
        task_name: str,
        status: str,
        admin_id: Optional[str] = None,
        details: Optional[str] = None,
        result_link: Optional[str] = None
    ) -> str:
        """
        Send notification about background task status.

        Args:
            task_id: ID of the background task
            task_name: Name of the task
            status: Task status (queued, running, completed, failed)
            admin_id: Optional ID of admin who initiated the task
            details: Optional additional details
            result_link: Optional link to task results

        Returns:
            Notification ID
        """
        logger.info(
            f"Sending task notification: {task_name} ({task_id}) - {status}")

        # Create status-appropriate title and message
        title_prefix = f"Task {status.capitalize()}"
        title = f"{title_prefix}: {task_name}"

        message_map = {
            "queued": f"Task '{task_name}' has been queued for processing.",
            "running": f"Task '{task_name}' is now running.",
            "completed": f"Task '{task_name}' has completed successfully.",
            "failed": f"Task '{task_name}' has failed."
        }
        message = message_map.get(
            status.lower(), f"Task '{task_name}' status: {status}")

        if details:
            message += f" {details}"

        # Determine priority based on status
        priority_map = {
            "queued": NotificationPriority.LOW,
            "running": NotificationPriority.LOW,
            "completed": NotificationPriority.NORMAL,
            "failed": NotificationPriority.HIGH
        }
        priority = priority_map.get(
            status.lower(), NotificationPriority.NORMAL)

        # Create notification metadata
        metadata = {
            "task_id": task_id,
            "task_name": task_name,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }

        # Determine recipient(s)
        if admin_id:
            # Notify specific admin who initiated the task
            db = next(get_db())
            admin = get_admin_by_id(db, admin_id)

            if admin:
                notification_id = self.notification_system.create_notification(
                    title=title,
                    body=message,
                    category=NotificationCategory.TASK,
                    priority=priority,
                    recipient_type=RecipientType.ADMIN,
                    recipient_ids=[admin_id],
                    channels=[NotificationChannel.IN_APP],
                    link=result_link,
                    metadata=metadata
                )
                return notification_id

        # Default to notifying system admins for orphaned tasks
        return self.notify_admins_by_role(
            roles=[AdminRole.SUPER_ADMIN, AdminRole.SYSTEM_ADMIN],
            title=title,
            message=message,
            category=NotificationCategory.TASK,
            priority=priority,
            channels=[NotificationChannel.IN_APP],
            link=result_link,
            metadata=metadata
        )


# Create singleton instance for import
notification_service = AdminNotificationService()


# Convenience functions for common notification patterns

async def notify_tenant_created(tenant_id: str, tenant_name: str, created_by_admin_id: str) -> str:
    """Notify relevant admins about new tenant creation."""
    try:
        return await notification_service.notify_admins_by_role(
            roles=[AdminRole.SUPER_ADMIN, AdminRole.SYSTEM_ADMIN],
            title=f"New Tenant Created: {tenant_name}",
            message=f"A new tenant '{tenant_name}' (ID: {tenant_id}) has been created.",
            category=NotificationCategory.TENANT,
            priority=NotificationPriority.NORMAL,
            channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            metadata={
                "tenant_id": tenant_id,
                "created_by": created_by_admin_id,
                "event_type": "tenant_created",
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    except NotificationDeliveryError as e:
        logger.error(f"Failed to notify about tenant creation: {e}")
        return ""


async def notify_security_event(event_type: str, severity: str, details: str,
                                affected_tenant_id: Optional[str] = None) -> str:
    """Notify security admins about security events."""
    try:
        metadata = {
            "event_type": event_type,
            "severity": severity,
            "timestamp": datetime.utcnow().isoformat()
        }

        if affected_tenant_id:
            metadata["affected_tenant_id"] = affected_tenant_id

        return await notification_service.send_system_alert(
            alert_type="security",
            message=details,
            affected_component=event_type,
            severity=severity,
            additional_info=metadata
        )
    except NotificationDeliveryError as e:
        logger.error(f"Failed to notify about security event: {e}")
        return ""


async def notify_background_task_status(task_id: str, task_name: str, status: str,
                                        admin_id: Optional[str] = None, details: Optional[str] = None,
                                        result_link: Optional[str] = None,
                                        task_data: Optional[Dict[str, Any]] = None) -> str:
    """Notify about background task status changes."""
    try:
        return await notification_service.send_task_notification(
            task_id=task_id,
            task_name=task_name,
            status=status,
            admin_id=admin_id,
            details=details,
            result_link=result_link
        )
    except NotificationDeliveryError as e:
        logger.error(f"Failed to send task notification: {e}")
        return ""
