import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from backend.app.models.notifications.admin_notification import AdminNotification
from backend.app.core.notifications.unified_notification_system import (
    UnifiedNotification,
    RecipientType,
    NotificationPriority,
    NotificationCategory,
    NotificationChannel,
)


class NotificationStorageService:
    """Service for storing and retrieving notifications from the database."""

    async def store_notification(
        self,
        db: AsyncSession,
        notification: UnifiedNotification
    ) -> AdminNotification:
        """
        Store a unified notification in the database.

        Args:
            db: Database session
            notification: Unified notification to store

        Returns:
            Stored AdminNotification
        """
        # Convert UnifiedNotification to AdminNotification
        admin_notification = AdminNotification(
            id=uuid.UUID(notification.id),
            tenant_id=uuid.UUID(
                notification.tenant_id) if notification.tenant_id else None,
            recipient_type=notification.recipient_type.value,
            recipient_id=uuid.UUID(
                notification.recipient_id) if notification.recipient_id else None,
            title=notification.title,
            message=notification.message,
            priority=notification.priority.value,
            category=notification.category.value,
            channels=[channel.value for channel in notification.channels],
            action_url=notification.action_url,
            action_text=notification.action_text,
            metadata=notification.metadata,
            created_at=notification.created_at,
            expires_at=notification.expires_at,
            sent_at=notification.sent_at,
            read_at=notification.read_at,
            status=notification.status,
        )

        db.add(admin_notification)
        await db.commit()
        await db.refresh(admin_notification)

        return admin_notification

    async def get_notifications_for_user(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        tenant_id: Optional[uuid.UUID] = None,
        is_admin: bool = False,
        is_tenant_admin: bool = False,
        limit: int = 50,
        offset: int = 0,
        include_read: bool = False,
        include_archived: bool = False
    ) -> List[AdminNotification]:
        """
        Get notifications for a specific user.

        Args:
            db: Database session
            user_id: User ID
            tenant_id: Optional tenant ID
            is_admin: Whether user is an admin
            is_tenant_admin: Whether user is a tenant admin
            limit: Maximum number of notifications to return
            offset: Number of notifications to skip
            include_read: Whether to include read notifications
            include_archived: Whether to include archived notifications

        Returns:
            List of notifications
        """
        query = select(AdminNotification)

        # Build conditions based on user type and permissions
        conditions = []

        if is_admin:
            # Admin users can see admin notifications
            conditions.append(
                or_(
                    AdminNotification.recipient_type == RecipientType.ALL_ADMINS.value,
                    and_(
                        AdminNotification.recipient_type == RecipientType.ADMIN_USER.value,
                        AdminNotification.recipient_id == user_id
                    )
                )
            )

        if is_tenant_admin and tenant_id:
            # Tenant admins can see tenant admin notifications
            conditions.append(
                and_(
                    AdminNotification.tenant_id == tenant_id,
                    or_(
                        AdminNotification.recipient_type == RecipientType.ALL_TENANT_ADMINS.value,
                        and_(
                            AdminNotification.recipient_type == RecipientType.TENANT_ADMIN.value,
                            AdminNotification.recipient_id == user_id
                        )
                    )
                )
            )

        if tenant_id:
            # Regular tenant users can see tenant notifications
            conditions.append(
                and_(
                    AdminNotification.tenant_id == tenant_id,
                    or_(
                        AdminNotification.recipient_type == RecipientType.TENANT.value,
                        and_(
                            AdminNotification.recipient_type == RecipientType.TENANT_USER.value,
                            AdminNotification.recipient_id == user_id
                        )
                    )
                )
            )

        # Combine conditions
        if conditions:
            query = query.where(or_(*conditions))

        # Filter by read status
        if not include_read:
            query = query.where(AdminNotification.is_read == False)

        # Filter by archived status
        if not include_archived:
            query = query.where(AdminNotification.is_archived == False)

        # Order by creation date (newest first)
        query = query.order_by(AdminNotification.created_at.desc())

        # Apply pagination
        query = query.limit(limit).offset(offset)

        result = await db.execute(query)
        return result.scalars().all()

    async def mark_notification_as_read(
        self,
        db: AsyncSession,
        notification_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Optional[AdminNotification]:
        """
        Mark a notification as read.

        Args:
            db: Database session
            notification_id: Notification ID
            user_id: User ID marking the notification as read

        Returns:
            Updated notification or None if not found
        """
        query = select(AdminNotification).where(
            AdminNotification.id == notification_id)
        result = await db.execute(query)
        notification = result.scalars().first()

        if notification:
            notification.is_read = True
            notification.read_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(notification)

        return notification

    async def mark_notification_as_sent(
        self,
        db: AsyncSession,
        notification_id: uuid.UUID
    ) -> Optional[AdminNotification]:
        """
        Mark a notification as sent.

        Args:
            db: Database session
            notification_id: Notification ID

        Returns:
            Updated notification or None if not found
        """
        query = select(AdminNotification).where(
            AdminNotification.id == notification_id)
        result = await db.execute(query)
        notification = result.scalars().first()

        if notification:
            notification.status = "sent"
            notification.sent_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(notification)

        return notification

    async def archive_notification(
        self,
        db: AsyncSession,
        notification_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Optional[AdminNotification]:
        """
        Archive a notification.

        Args:
            db: Database session
            notification_id: Notification ID
            user_id: User ID archiving the notification

        Returns:
            Updated notification or None if not found
        """
        query = select(AdminNotification).where(
            AdminNotification.id == notification_id)
        result = await db.execute(query)
        notification = result.scalars().first()

        if notification:
            notification.is_archived = True
            await db.commit()
            await db.refresh(notification)

        return notification

    async def get_notification_stats(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        tenant_id: Optional[uuid.UUID] = None,
        is_admin: bool = False,
        is_tenant_admin: bool = False
    ) -> Dict[str, int]:
        """
        Get notification statistics for a user.

        Args:
            db: Database session
            user_id: User ID
            tenant_id: Optional tenant ID
            is_admin: Whether user is an admin
            is_tenant_admin: Whether user is a tenant admin

        Returns:
            Dictionary with notification counts
        """
        # Build conditions similar to get_notifications_for_user
        conditions = []

        if is_admin:
            conditions.append(
                or_(
                    AdminNotification.recipient_type == RecipientType.ALL_ADMINS.value,
                    and_(
                        AdminNotification.recipient_type == RecipientType.ADMIN_USER.value,
                        AdminNotification.recipient_id == user_id
                    )
                )
            )

        if is_tenant_admin and tenant_id:
            conditions.append(
                and_(
                    AdminNotification.tenant_id == tenant_id,
                    or_(
                        AdminNotification.recipient_type == RecipientType.ALL_TENANT_ADMINS.value,
                        and_(
                            AdminNotification.recipient_type == RecipientType.TENANT_ADMIN.value,
                            AdminNotification.recipient_id == user_id
                        )
                    )
                )
            )

        if tenant_id:
            conditions.append(
                and_(
                    AdminNotification.tenant_id == tenant_id,
                    or_(
                        AdminNotification.recipient_type == RecipientType.TENANT.value,
                        and_(
                            AdminNotification.recipient_type == RecipientType.TENANT_USER.value,
                            AdminNotification.recipient_id == user_id
                        )
                    )
                )
            )

        base_query = select(AdminNotification)
        if conditions:
            base_query = base_query.where(or_(*conditions))

        # Get total notifications
        total_query = base_query.where(
            and_(
                AdminNotification.is_archived == False
            )
        )
        total_result = await db.execute(total_query)
        total_count = len(total_result.scalars().all())

        # Get unread notifications
        unread_query = base_query.where(
            and_(
                AdminNotification.is_read == False,
                AdminNotification.is_archived == False
            )
        )
        unread_result = await db.execute(unread_query)
        unread_count = len(unread_result.scalars().all())

        # Get high priority notifications
        high_priority_query = base_query.where(
            and_(
                AdminNotification.priority == NotificationPriority.HIGH.value,
                AdminNotification.is_read == False,
                AdminNotification.is_archived == False
            )
        )
        high_priority_result = await db.execute(high_priority_query)
        high_priority_count = len(high_priority_result.scalars().all())

        return {
            "total": total_count,
            "unread": unread_count,
            "high_priority": high_priority_count,
        }
