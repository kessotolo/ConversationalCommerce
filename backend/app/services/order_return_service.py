from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.order import Order, OrderStatus
from backend.app.models.order_return import OrderReturn, ReturnStatus, ReturnReason
from backend.app.models.order_item import OrderItem
from backend.app.schemas.order_return import OrderReturnRequest, OrderReturnUpdate
from backend.app.services.order_exceptions import OrderNotFoundError, OrderValidationError
from backend.app.services.audit_service import create_audit_log, AuditActionType

"""
Order Return Service

This service handles the business logic for order returns and cancellations,
providing functionality for:

- Creating return requests
- Updating return status
- Approving or rejecting returns
- Processing refunds for returns
- Cancelling orders

Key business rules:
1. Only delivered orders can be returned
2. Only pending, confirmed, or processing orders can be cancelled
3. Orders can only be cancelled or returned by the customer who placed them
4. Returns require approval by an admin or seller
5. Return status follows a defined workflow
"""


class OrderReturnService:
    """Service for handling order returns and cancellations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_return_request(
        self, 
        return_request: OrderReturnRequest, 
        customer_id: UUID,
        tenant_id: UUID,
    ) -> OrderReturn:
        """
        Create a new return request for an order.
        
        Args:
            return_request: Return request data
            customer_id: ID of the customer making the return
            tenant_id: Tenant ID for isolation
            
        Returns:
            Created OrderReturn object
            
        Raises:
            OrderNotFoundError: If the order doesn't exist
            OrderValidationError: If the order can't be returned
        """
        # Get the order
        result = await self.db.execute(
            select(Order).where(
                Order.id == return_request.order_id,
                Order.customer_id == customer_id,
                Order.tenant_id == tenant_id,
                Order.is_deleted == False
            )
        )
        order = result.scalar_one_or_none()
        
        if not order:
            raise OrderNotFoundError(f"Order {return_request.order_id} not found")
            
        # Check if order is eligible for return (must be delivered)
        if order.status != OrderStatus.delivered:
            raise OrderValidationError(
                "Only delivered orders can be returned. "
                f"Current status: {order.status}"
            )
            
        # Validate items being returned exist in the order
        item_ids = [item.order_item_id for item in return_request.items]
        result = await self.db.execute(
            select(OrderItem).where(
                OrderItem.id.in_(item_ids),
                OrderItem.order_id == order.id
            )
        )
        order_items = result.scalars().all()
        
        if len(order_items) != len(item_ids):
            raise OrderValidationError("Some items do not belong to this order")
            
        # Create items_returned JSON representation
        items_returned = [
            {
                "order_item_id": str(item.order_item_id),
                "product_id": str(next((i.product_id for i in order_items if i.id == item.order_item_id), None)),
                "quantity": item.quantity,
                "reason": item.reason,
                "description": item.description,
                "images": item.images
            }
            for item in return_request.items
        ]
        
        # Calculate refund amount (initially set to null, will be determined during approval)
        refund_amount = None
        
        # Create the return request
        order_return = OrderReturn(
            order_id=order.id,
            tenant_id=tenant_id,
            customer_id=customer_id,
            return_reason=return_request.reason,
            return_description=return_request.description,
            items_returned=items_returned,
            refund_amount=refund_amount,
        )
        
        self.db.add(order_return)
        await self.db.commit()
        await self.db.refresh(order_return)
        
        # Create audit log
        await create_audit_log(
            self.db,
            tenant_id=tenant_id,
            action_type=AuditActionType.create,
            entity_type="order_return",
            entity_id=str(order_return.id),
            actor_id=str(customer_id),
            details={
                "order_id": str(order.id),
                "return_reason": return_request.reason.value,
                "items_count": len(return_request.items)
            }
        )
        
        return order_return
        
    async def update_return_status(
        self, 
        return_id: UUID, 
        status_update: OrderReturnUpdate,
        admin_id: UUID,
        tenant_id: UUID,
    ) -> OrderReturn:
        """
        Update the status of a return request.
        
        Args:
            return_id: ID of the return to update
            status_update: New status and related data
            admin_id: ID of the admin making the update
            tenant_id: Tenant ID for isolation
            
        Returns:
            Updated OrderReturn object
            
        Raises:
            OrderNotFoundError: If the return doesn't exist
            OrderValidationError: If the status transition is invalid
        """
        # Get the return
        result = await self.db.execute(
            select(OrderReturn).where(
                OrderReturn.id == return_id,
                OrderReturn.tenant_id == tenant_id
            )
        )
        order_return = result.scalar_one_or_none()
        
        if not order_return:
            raise OrderNotFoundError(f"Return {return_id} not found")
            
        # Validate status transition
        current_status = order_return.return_status
        new_status = status_update.status
        
        if not self._is_valid_return_transition(current_status, new_status):
            raise OrderValidationError(
                f"Invalid status transition: {current_status} -> {new_status}"
            )
            
        # Update status
        order_return.return_status = new_status
        
        # Set timestamp based on status
        if new_status == ReturnStatus.approved:
            order_return.approved_at = datetime.now()
            order_return.approved_by = admin_id
            order_return.approval_notes = status_update.notes
            
        elif new_status == ReturnStatus.rejected:
            order_return.rejected_at = datetime.now()
            order_return.rejection_reason = status_update.rejection_reason
            
        elif new_status == ReturnStatus.received:
            order_return.received_at = datetime.now()
            
        elif new_status == ReturnStatus.refunded:
            order_return.refunded_at = datetime.now()
            
        # Update tracking info if provided
        if status_update.tracking_number:
            order_return.return_tracking_number = status_update.tracking_number
            
        if status_update.return_label_url:
            order_return.return_label_url = status_update.return_label_url
            
        # If approved, update the order status to returned
        if new_status == ReturnStatus.approved:
            result = await self.db.execute(
                select(Order).where(Order.id == order_return.order_id)
            )
            order = result.scalar_one_or_none()
            
            if order:
                order.status = OrderStatus.returned
                order.returned_at = datetime.now()
                order.return_reason = order_return.return_reason.value
                
        await self.db.commit()
        await self.db.refresh(order_return)
        
        # Create audit log
        await create_audit_log(
            self.db,
            tenant_id=tenant_id,
            action_type=AuditActionType.update,
            entity_type="order_return",
            entity_id=str(order_return.id),
            actor_id=str(admin_id),
            details={
                "previous_status": current_status,
                "new_status": new_status,
                "notes": status_update.notes
            }
        )
        
        return order_return
        
    async def cancel_order(
        self, 
        order_id: UUID, 
        reason: str,
        customer_id: UUID,
        tenant_id: UUID,
    ) -> Order:
        """
        Cancel an order.
        
        Args:
            order_id: ID of the order to cancel
            reason: Reason for cancellation
            customer_id: ID of the customer cancelling the order
            tenant_id: Tenant ID for isolation
            
        Returns:
            Updated Order object
            
        Raises:
            OrderNotFoundError: If the order doesn't exist
            OrderValidationError: If the order can't be cancelled
        """
        # Get the order
        result = await self.db.execute(
            select(Order).where(
                Order.id == order_id,
                Order.customer_id == customer_id,
                Order.tenant_id == tenant_id,
                Order.is_deleted == False
            )
        )
        order = result.scalar_one_or_none()
        
        if not order:
            raise OrderNotFoundError(f"Order {order_id} not found")
            
        # Check if order is eligible for cancellation
        cancellable_statuses = [
            OrderStatus.pending, 
            OrderStatus.confirmed,
            OrderStatus.processing
        ]
        
        if order.status not in cancellable_statuses:
            raise OrderValidationError(
                f"Orders in {order.status} status cannot be cancelled. "
                f"Only {', '.join(s.value for s in cancellable_statuses)} orders can be cancelled."
            )
            
        # Update order status
        order.status = OrderStatus.cancelled
        order.cancelled_at = datetime.now()
        order.cancellation_reason = reason
        
        await self.db.commit()
        await self.db.refresh(order)
        
        # Create audit log
        await create_audit_log(
            self.db,
            tenant_id=tenant_id,
            action_type=AuditActionType.update,
            entity_type="order",
            entity_id=str(order.id),
            actor_id=str(customer_id),
            details={
                "action": "cancel_order",
                "reason": reason,
                "previous_status": order.status.value
            }
        )
        
        return order
        
    async def get_order_returns(
        self,
        customer_id: UUID,
        tenant_id: UUID,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[OrderReturn], int]:
        """
        Get all returns for a customer.
        
        Args:
            customer_id: Customer ID to filter by
            tenant_id: Tenant ID for isolation
            limit: Maximum number of returns to fetch
            offset: Offset for pagination
            
        Returns:
            Tuple of (list of OrderReturn objects, total count)
        """
        # Count total returns
        result = await self.db.execute(
            select(OrderReturn).where(
                OrderReturn.customer_id == customer_id,
                OrderReturn.tenant_id == tenant_id
            )
        )
        total = len(result.scalars().all())
        
        # Get paginated returns
        result = await self.db.execute(
            select(OrderReturn)
            .where(
                OrderReturn.customer_id == customer_id,
                OrderReturn.tenant_id == tenant_id
            )
            .order_by(OrderReturn.requested_at.desc())
            .limit(limit)
            .offset(offset)
        )
        returns = result.scalars().all()
        
        return returns, total
        
    def _is_valid_return_transition(self, current_status: ReturnStatus, new_status: ReturnStatus) -> bool:
        """
        Check if a return status transition is valid.
        
        Args:
            current_status: Current status of the return
            new_status: New status to transition to
            
        Returns:
            True if the transition is valid, False otherwise
        """
        # Define allowed transitions
        transitions = {
            ReturnStatus.requested: [ReturnStatus.approved, ReturnStatus.rejected],
            ReturnStatus.approved: [ReturnStatus.in_transit, ReturnStatus.received],
            ReturnStatus.in_transit: [ReturnStatus.received],
            ReturnStatus.received: [ReturnStatus.refunded],
            ReturnStatus.refunded: [ReturnStatus.closed],
            ReturnStatus.rejected: [ReturnStatus.closed]
        }
        
        if current_status in transitions:
            return new_status in transitions[current_status]
            
        return False
