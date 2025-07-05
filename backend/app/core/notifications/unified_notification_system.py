import logging
from typing import Any, Dict, List, Optional, Union
from enum import Enum
from datetime import datetime
import uuid
import asyncio
from pydantic import BaseModel, Field

from app.core.notifications.notification_service import (
    notification_service,
    Notification,
    NotificationChannel,
    NotificationPriority
)

logger = logging.getLogger(__name__)


class RecipientType(str, Enum):
    """Types of notification recipients"""
    ADMIN_USER = "admin_user"
    TENANT_USER = "tenant_user"
    TENANT_ADMIN = "tenant_admin"
    ALL_ADMINS = "all_admins"
    ALL_TENANT_ADMINS = "all_tenant_admins"
    TENANT = "tenant"


class NotificationCategory(str, Enum):
    """Categories of system notifications"""
    SYSTEM = "system"
    SECURITY = "security"
    PERFORMANCE = "performance"
    MAINTENANCE = "maintenance"
    TENANT_STATUS = "tenant_status"
    USER_ACTIVITY = "user_activity"
    ADMIN_ACTIVITY = "admin_activity"
    FEATURE_UPDATE = "feature_update"


class UnifiedNotification(BaseModel):
    """Enhanced notification model for the unified system"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: Optional[str] = None  # Optional for admin-only notifications
    recipient_type: RecipientType
    recipient_id: Optional[str] = None  # User ID or tenant ID, optional for broadcast
    title: str
    message: str
    priority: NotificationPriority
    category: NotificationCategory
    channels: List[NotificationChannel]
    action_url: Optional[str] = None  # URL for action button
    action_text: Optional[str] = None  # Text for action button
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    expires_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    status: str = "pending"


class UnifiedNotificationSystem:
    """
    Unified notification system that handles both admin and tenant contexts,
    providing a seamless notification experience across the entire platform.
    """
    
    def __init__(self):
        """Initialize the unified notification system"""
        self._base_notification_service = notification_service
    
    async def send_notification(self, notification: UnifiedNotification) -> bool:
        """
        Send a notification through the unified system
        
        Args:
            notification: Unified notification
        
        Returns:
            Success status
        """
        # Convert to base notification format
        base_notification = await self._convert_to_base_notification(notification)
        
        # Send through base notification service
        success = await self._base_notification_service.send_notification(base_notification)
        
        # Update notification status
        if success:
            notification.status = "sent"
            notification.sent_at = datetime.utcnow()
        else:
            notification.status = "failed"
        
        # Store notification in database (implementation needed)
        await self._store_notification(notification)
        
        return success
    
    async def _convert_to_base_notification(
        self, notification: UnifiedNotification
    ) -> Notification:
        """
        Convert unified notification to base notification format
        
        Args:
            notification: Unified notification
        
        Returns:
            Base notification
        """
        # For tenant notifications, use the tenant ID
        tenant_id = notification.tenant_id
        
        # For admin notifications, use "admin" as the tenant ID
        if notification.recipient_type in [
            RecipientType.ADMIN_USER, 
            RecipientType.ALL_ADMINS
        ] and not tenant_id:
            tenant_id = "admin"
        
        # Determine user ID
        user_id = notification.recipient_id
        if not user_id:
            if notification.recipient_type == RecipientType.ALL_ADMINS:
                user_id = "all_admins"
            elif notification.recipient_type == RecipientType.ALL_TENANT_ADMINS:
                user_id = "all_tenant_admins"
            elif notification.recipient_type == RecipientType.TENANT:
                user_id = f"tenant:{tenant_id}"
        
        # Enhanced metadata with unified system data
        enhanced_metadata = notification.metadata.copy()
        enhanced_metadata.update({
            "category": notification.category,
            "recipient_type": notification.recipient_type,
            "action_url": notification.action_url,
            "action_text": notification.action_text,
            "unified_notification_id": notification.id,
        })
        
        # Create base notification
        base_notification = Notification(
            id=str(uuid.uuid4()),  # Generate new ID for base notification
            tenant_id=tenant_id,
            user_id=user_id,
            title=notification.title,
            message=notification.message,
            priority=notification.priority,
            channels=notification.channels,
            metadata=enhanced_metadata,
            created_at=notification.created_at
        )
        
        return base_notification
    
    async def _store_notification(self, notification: UnifiedNotification) -> None:
        """
        Store notification in database
        
        Args:
            notification: Unified notification
        """
        # Implementation would typically involve database storage
        # For now, we'll just log it
        logger.info(f"Stored notification: {notification.id} - {notification.title}")
        # TODO: Implement database storage when admin notification model is added
    
    async def send_admin_notification(
        self,
        title: str,
        message: str,
        category: NotificationCategory,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        admin_user_id: Optional[str] = None,
        channels: List[NotificationChannel] = None,
        action_url: Optional[str] = None,
        action_text: Optional[str] = None,
        metadata: Dict[str, Any] = None
    ) -> UnifiedNotification:
        """
        Helper method to quickly send an admin notification
        
        Args:
            title: Notification title
            message: Notification message
            category: Notification category
            priority: Notification priority
            admin_user_id: Optional admin user ID (None for all admins)
            channels: Notification channels
            action_url: Optional URL for action button
            action_text: Optional text for action button
            metadata: Additional metadata
            
        Returns:
            Sent notification
        """
        if channels is None:
            channels = [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
            
        # Determine recipient type and ID
        recipient_type = RecipientType.ADMIN_USER if admin_user_id else RecipientType.ALL_ADMINS
        recipient_id = admin_user_id
        
        # Create notification
        notification = UnifiedNotification(
            tenant_id=None,  # No tenant for admin notifications
            recipient_type=recipient_type,
            recipient_id=recipient_id,
            title=title,
            message=message,
            priority=priority,
            category=category,
            channels=channels,
            action_url=action_url,
            action_text=action_text,
            metadata=metadata or {}
        )
        
        # Send notification
        await self.send_notification(notification)
        
        return notification
    
    async def send_tenant_notification(
        self,
        tenant_id: str,
        title: str,
        message: str,
        category: NotificationCategory,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        user_id: Optional[str] = None,
        is_tenant_admin: bool = False,
        channels: List[NotificationChannel] = None,
        action_url: Optional[str] = None,
        action_text: Optional[str] = None,
        metadata: Dict[str, Any] = None
    ) -> UnifiedNotification:
        """
        Helper method to quickly send a tenant notification
        
        Args:
            tenant_id: Tenant ID
            title: Notification title
            message: Notification message
            category: Notification category
            priority: Notification priority
            user_id: Optional user ID (None for all tenant users)
            is_tenant_admin: Whether the recipient is a tenant admin
            channels: Notification channels
            action_url: Optional URL for action button
            action_text: Optional text for action button
            metadata: Additional metadata
            
        Returns:
            Sent notification
        """
        if channels is None:
            channels = [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
            
        # Determine recipient type and ID
        if user_id and is_tenant_admin:
            recipient_type = RecipientType.TENANT_ADMIN
            recipient_id = user_id
        elif user_id and not is_tenant_admin:
            recipient_type = RecipientType.TENANT_USER
            recipient_id = user_id
        elif is_tenant_admin:
            recipient_type = RecipientType.ALL_TENANT_ADMINS
            recipient_id = None
        else:
            recipient_type = RecipientType.TENANT
            recipient_id = None
        
        # Create notification
        notification = UnifiedNotification(
            tenant_id=tenant_id,
            recipient_type=recipient_type,
            recipient_id=recipient_id,
            title=title,
            message=message,
            priority=priority,
            category=category,
            channels=channels,
            action_url=action_url,
            action_text=action_text,
            metadata=metadata or {}
        )
        
        # Send notification
        await self.send_notification(notification)
        
        return notification
    
    async def send_cross_context_notification(
        self,
        title: str,
        message: str,
        category: NotificationCategory,
        priority: NotificationPriority = NotificationPriority.HIGH,
        tenant_ids: Optional[List[str]] = None,  # None for all tenants
        admin_users: bool = True,
        tenant_admins: bool = True,
        channels: List[NotificationChannel] = None,
        action_url: Optional[str] = None,
        action_text: Optional[str] = None,
        metadata: Dict[str, Any] = None
    ) -> List[UnifiedNotification]:
        """
        Send notification across multiple contexts (admin and tenant)
        
        Args:
            title: Notification title
            message: Notification message
            category: Notification category
            priority: Notification priority
            tenant_ids: Optional list of tenant IDs
            admin_users: Whether to send to admin users
            tenant_admins: Whether to send to tenant admins
            channels: Notification channels
            action_url: Optional URL for action button
            action_text: Optional text for action button
            metadata: Additional metadata
            
        Returns:
            List of sent notifications
        """
        if channels is None:
            channels = [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
            
        sent_notifications = []
        
        # Send to admin users if requested
        if admin_users:
            admin_notification = await self.send_admin_notification(
                title=title,
                message=message,
                category=category,
                priority=priority,
                channels=channels,
                action_url=action_url,
                action_text=action_text,
                metadata=metadata
            )
            sent_notifications.append(admin_notification)
        
        # Send to tenant admins if requested
        if tenant_admins and tenant_ids:
            for tenant_id in tenant_ids:
                tenant_admin_notification = await self.send_tenant_notification(
                    tenant_id=tenant_id,
                    title=title,
                    message=message,
                    category=category,
                    priority=priority,
                    is_tenant_admin=True,
                    channels=channels,
                    action_url=action_url,
                    action_text=action_text,
                    metadata=metadata
                )
                sent_notifications.append(tenant_admin_notification)
        
        return sent_notifications


# Create singleton instance
unified_notification_system = UnifiedNotificationSystem()
