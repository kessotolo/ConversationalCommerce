from typing import Dict, List, Any, Optional
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

from app.models.returns import ReturnRequest, ReturnStatus
from app.models.users import User
from app.models.notifications import NotificationType, NotificationChannel
from app.repositories.return_repository import ReturnRepository
from app.repositories.user_repository import UserRepository
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

class ReturnNotificationService:
    """Service for sending notifications about return status changes"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.return_repo = ReturnRepository(db)
        self.user_repo = UserRepository(db)
        self.notification_service = NotificationService(db)
        
    async def notify_on_status_change(
        self, 
        return_request_id: str, 
        tenant_id: str,
        previous_status: Optional[ReturnStatus] = None,
        current_status: Optional[ReturnStatus] = None,
        additional_data: Dict[str, Any] = None
    ) -> None:
        """
        Send notifications based on return request status changes
        
        Args:
            return_request_id: The ID of the return request
            tenant_id: The tenant ID
            previous_status: The previous status (if known)
            current_status: The current status (if known)
            additional_data: Additional data to include in the notification
        """
        # Get the return request if statuses not provided
        if not (previous_status and current_status):
            return_request = await self.return_repo.get_by_id(return_request_id, tenant_id)
            if not return_request:
                logger.error(f"Return request {return_request_id} not found")
                return
            
            # Can't determine status change without previous status
            if not previous_status:
                logger.warning("Previous status not provided, can't determine status change")
                return
                
            current_status = return_request.status
        
        # No status change, no notification needed
        if previous_status == current_status:
            return
            
        # Get the return request with items
        return_request = await self.return_repo.get_by_id(return_request_id, tenant_id)
        if not return_request:
            logger.error(f"Return request {return_request_id} not found")
            return
            
        # Get customer and seller for notifications
        customer = await self.user_repo.get_by_id(return_request.customer_id)
        seller = await self._get_store_admin(tenant_id)
        
        # Get notification data
        notification_data = await self._prepare_notification_data(
            return_request, 
            previous_status, 
            current_status, 
            additional_data or {}
        )
        
        # Determine which notifications to send based on status change
        tasks = []
        
        # Notifications for customer
        if customer and notification_data.get("customer_notification"):
            tasks.append(self._send_customer_notification(
                customer,
                return_request,
                notification_data["customer_notification"],
                current_status
            ))
        
        # Notifications for seller/admin
        if seller and notification_data.get("seller_notification"):
            tasks.append(self._send_seller_notification(
                seller,
                return_request,
                notification_data["seller_notification"],
                current_status
            ))
            
        # Execute all notification tasks
        if tasks:
            await asyncio.gather(*tasks)
    
    async def _prepare_notification_data(
        self,
        return_request: ReturnRequest,
        previous_status: ReturnStatus,
        current_status: ReturnStatus,
        additional_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Prepare notification content based on status change
        
        Args:
            return_request: The return request
            previous_status: Previous status
            current_status: New status
            additional_data: Additional data for the notification
            
        Returns:
            Dictionary with notification content for different recipients
        """
        result = {
            "customer_notification": None,
            "seller_notification": None
        }
        
        # Get the order number
        order_id = return_request.order_id
        
        # Prepare notification data based on the new status
        if current_status == ReturnStatus.REQUESTED:
            # New return request
            result["customer_notification"] = {
                "title": "Return Request Received",
                "message": f"We've received your return request #{return_request.return_number} for order #{order_id}. " +
                          "We'll review it and get back to you soon.",
                "type": NotificationType.RETURN_REQUESTED,
                "action_url": f"/account/returns/{return_request.id}"
            }
            
            result["seller_notification"] = {
                "title": "New Return Request",
                "message": f"A new return request #{return_request.return_number} has been created for order #{order_id}.",
                "type": NotificationType.RETURN_REQUESTED,
                "action_url": f"/seller/returns/{return_request.id}"
            }
            
        elif current_status == ReturnStatus.UNDER_REVIEW:
            # Return is being reviewed
            result["customer_notification"] = {
                "title": "Return Under Review",
                "message": f"Your return request #{return_request.return_number} is now being reviewed. " +
                          "We'll update you once the review is complete.",
                "type": NotificationType.RETURN_UPDATED,
                "action_url": f"/account/returns/{return_request.id}"
            }
            
        elif current_status == ReturnStatus.APPROVED:
            # Return approved
            return_instructions = additional_data.get("return_instructions", "")
            
            result["customer_notification"] = {
                "title": "Return Request Approved",
                "message": f"Your return request #{return_request.return_number} has been approved. " +
                          f"{return_instructions}",
                "type": NotificationType.RETURN_APPROVED,
                "action_url": f"/account/returns/{return_request.id}"
            }
            
            result["seller_notification"] = {
                "title": "Return Request Approved",
                "message": f"Return request #{return_request.return_number} for order #{order_id} has been approved.",
                "type": NotificationType.RETURN_APPROVED,
                "action_url": f"/seller/returns/{return_request.id}"
            }
            
        elif current_status == ReturnStatus.PARTIAL_APPROVED:
            # Return partially approved
            result["customer_notification"] = {
                "title": "Return Request Partially Approved",
                "message": f"Your return request #{return_request.return_number} has been partially approved. " +
                          "Please check the details to see which items were approved.",
                "type": NotificationType.RETURN_PARTIAL_APPROVED,
                "action_url": f"/account/returns/{return_request.id}"
            }
            
        elif current_status == ReturnStatus.REJECTED:
            # Return rejected
            rejection_reason = additional_data.get("rejection_reason", "")
            
            result["customer_notification"] = {
                "title": "Return Request Not Approved",
                "message": f"Unfortunately, your return request #{return_request.return_number} was not approved. " +
                          f"Reason: {rejection_reason}",
                "type": NotificationType.RETURN_REJECTED,
                "action_url": f"/account/returns/{return_request.id}"
            }
            
        elif current_status == ReturnStatus.RECEIVED:
            # Items received
            result["customer_notification"] = {
                "title": "Return Items Received",
                "message": f"We've received the items for your return #{return_request.return_number}. " +
                          "Your refund is being processed.",
                "type": NotificationType.RETURN_RECEIVED,
                "action_url": f"/account/returns/{return_request.id}"
            }
            
            result["seller_notification"] = {
                "title": "Return Items Received",
                "message": f"Items for return #{return_request.return_number} have been received. " +
                          "Refund processing is pending.",
                "type": NotificationType.RETURN_RECEIVED,
                "action_url": f"/seller/returns/{return_request.id}"
            }
            
        elif current_status == ReturnStatus.COMPLETED:
            # Return completed with refund
            refund_amount = additional_data.get("refund_amount", "")
            refund_method = additional_data.get("refund_method", "")
            
            result["customer_notification"] = {
                "title": "Refund Processed",
                "message": f"Your refund of {refund_amount} for return #{return_request.return_number} " +
                          f"has been processed via {refund_method}.",
                "type": NotificationType.REFUND_PROCESSED,
                "action_url": f"/account/returns/{return_request.id}"
            }
            
            result["seller_notification"] = {
                "title": "Return Completed",
                "message": f"Return #{return_request.return_number} has been completed and refund processed.",
                "type": NotificationType.REFUND_PROCESSED,
                "action_url": f"/seller/returns/{return_request.id}"
            }
            
        elif current_status == ReturnStatus.CANCELLED:
            # Return cancelled
            result["customer_notification"] = {
                "title": "Return Request Cancelled",
                "message": f"Your return request #{return_request.return_number} has been cancelled.",
                "type": NotificationType.RETURN_CANCELLED,
                "action_url": f"/account/returns/{return_request.id}"
            }
            
            result["seller_notification"] = {
                "title": "Return Request Cancelled",
                "message": f"Return request #{return_request.return_number} for order #{order_id} has been cancelled.",
                "type": NotificationType.RETURN_CANCELLED,
                "action_url": f"/seller/returns/{return_request.id}"
            }
        
        return result
    
    async def _send_customer_notification(
        self, 
        customer: User, 
        return_request: ReturnRequest, 
        notification_data: Dict[str, Any],
        status: ReturnStatus
    ) -> None:
        """Send notification to the customer"""
        # Add customer data to the notification
        notification_data.update({
            "recipient_id": customer.id,
            "recipient_type": "customer",
            "tenant_id": return_request.tenant_id,
            "resource_id": return_request.id,
            "resource_type": "return",
            "metadata": {
                "return_id": return_request.id,
                "return_number": return_request.return_number,
                "order_id": return_request.order_id,
                "status": status
            }
        })
        
        # Determine notification channels based on customer preferences and status importance
        channels = self._get_customer_notification_channels(status, customer)
        
        # Send notifications through all appropriate channels
        for channel in channels:
            await self.notification_service.send_notification(
                tenant_id=return_request.tenant_id,
                recipient_id=customer.id,
                channel=channel,
                **notification_data
            )
            
    async def _send_seller_notification(
        self, 
        seller: User, 
        return_request: ReturnRequest, 
        notification_data: Dict[str, Any],
        status: ReturnStatus
    ) -> None:
        """Send notification to the seller/admin"""
        # Add seller data to the notification
        notification_data.update({
            "recipient_id": seller.id,
            "recipient_type": "seller",
            "tenant_id": return_request.tenant_id,
            "resource_id": return_request.id,
            "resource_type": "return",
            "metadata": {
                "return_id": return_request.id,
                "return_number": return_request.return_number,
                "order_id": return_request.order_id,
                "customer_id": return_request.customer_id,
                "status": status
            }
        })
        
        # Determine notification channels based on seller preferences and status importance
        channels = self._get_seller_notification_channels(status, seller)
        
        # Send notifications through all appropriate channels
        for channel in channels:
            await self.notification_service.send_notification(
                tenant_id=return_request.tenant_id,
                recipient_id=seller.id,
                channel=channel,
                **notification_data
            )
    
    def _get_customer_notification_channels(
        self, 
        status: ReturnStatus, 
        customer: User
    ) -> List[NotificationChannel]:
        """
        Determine which channels to use for customer notifications
        
        Args:
            status: Return status
            customer: Customer user
            
        Returns:
            List of notification channels
        """
        # Default to in-app notifications for all statuses
        channels = [NotificationChannel.IN_APP]
        
        # For important status changes, also send email
        important_statuses = [
            ReturnStatus.APPROVED,
            ReturnStatus.PARTIAL_APPROVED,
            ReturnStatus.REJECTED,
            ReturnStatus.COMPLETED
        ]
        
        if status in important_statuses and hasattr(customer, "email_notifications") and customer.email_notifications:
            channels.append(NotificationChannel.EMAIL)
            
        # For critical updates, also send SMS if available
        critical_statuses = [
            ReturnStatus.APPROVED,
            ReturnStatus.COMPLETED
        ]
        
        if status in critical_statuses and hasattr(customer, "sms_notifications") and customer.sms_notifications:
            channels.append(NotificationChannel.SMS)
            
        return channels
    
    def _get_seller_notification_channels(
        self, 
        status: ReturnStatus, 
        seller: User
    ) -> List[NotificationChannel]:
        """
        Determine which channels to use for seller notifications
        
        Args:
            status: Return status
            seller: Seller user
            
        Returns:
            List of notification channels
        """
        # Default to in-app notifications for all statuses
        channels = [NotificationChannel.IN_APP]
        
        # For new returns and received items, also send email
        important_statuses = [
            ReturnStatus.REQUESTED,
            ReturnStatus.RECEIVED
        ]
        
        if status in important_statuses and hasattr(seller, "email_notifications") and seller.email_notifications:
            channels.append(NotificationChannel.EMAIL)
            
        return channels
    
    async def _get_store_admin(self, tenant_id: str) -> Optional[User]:
        """
        Get the store admin for notifications
        
        Args:
            tenant_id: The tenant ID
            
        Returns:
            Store admin user or None
        """
        # In a real implementation, you would fetch the store admin or owner
        # This is a simplified placeholder
        try:
            admin = await self.user_repo.get_tenant_admin(tenant_id)
            return admin
        except Exception as e:
            logger.error(f"Failed to get admin for tenant {tenant_id}: {e}")
            return None
            
    async def track_return_status_update(
        self,
        return_request_id: str,
        tenant_id: str,
        status: ReturnStatus,
        user_id: str,
        note: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Track a status update for a return request
        
        Args:
            return_request_id: The return request ID
            tenant_id: The tenant ID
            status: The new status
            user_id: ID of the user making the update
            note: Optional note about the status change
            
        Returns:
            Dictionary with the status update details
        """
        # Get the return request to know the previous status
        return_request = await self.return_repo.get_by_id(return_request_id, tenant_id)
        if not return_request:
            raise ValueError(f"Return request {return_request_id} not found")
            
        previous_status = return_request.status
        
        # Create a status update record
        status_update = {
            "return_request_id": return_request_id,
            "previous_status": previous_status,
            "new_status": status,
            "changed_by": user_id,
            "note": note,
            "timestamp": datetime.now().isoformat()
        }
        
        # In a real implementation, you would save this to a status_history table
        # For now, we'll just pretend we saved it and return the data
        
        # Update the return request status
        additional_data = {}
        if note:
            additional_data["note"] = note
            
        await self.return_repo.update(
            return_request_id=return_request_id,
            tenant_id=tenant_id,
            data={"status": status}
        )
        
        # Send notifications about the status change
        await self.notify_on_status_change(
            return_request_id=return_request_id,
            tenant_id=tenant_id,
            previous_status=previous_status,
            current_status=status,
            additional_data=additional_data
        )
        
        return status_update
