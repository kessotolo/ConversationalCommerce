import logging
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
from sqlalchemy.orm import joinedload
from app.app.models.order import Order, OrderStatus
from app.app.models.order_channel_meta import OrderChannelMeta
from app.app.services.order_exceptions import OrderNotFoundError, OrderValidationError
from app.app.services.audit_service import AuditActionType, create_audit_log
from app.app.core.exceptions import AppError
from app.app.domain.events.event_bus import get_event_bus
from app.app.domain.events.order_events import OrderEventFactory

logger = logging.getLogger(__name__)


class OrderStatusService:
    """
    Service for managing order status transitions with proper validation and audit logging.
    """

    # Define valid status transitions
    VALID_TRANSITIONS = {
        OrderStatus.pending: [OrderStatus.confirmed, OrderStatus.cancelled],
        OrderStatus.confirmed: [OrderStatus.processing, OrderStatus.cancelled],
        OrderStatus.processing: [OrderStatus.shipped, OrderStatus.cancelled],
        OrderStatus.shipped: [OrderStatus.delivered, OrderStatus.returned],
        OrderStatus.delivered: [OrderStatus.returned],
        OrderStatus.cancelled: [],  # Terminal state
        OrderStatus.returned: [],   # Terminal state
    }

    # Statuses that allow cancellation
    CANCELLABLE_STATUSES = [OrderStatus.pending,
                            OrderStatus.confirmed, OrderStatus.processing]

    def __init__(self, db: AsyncSession):
        self.db = db
        self.event_bus = get_event_bus()

    async def update_order_status(self, order_id: UUID, status_update: Dict[str, Any], seller_id: UUID) -> Optional[Order]:
        """
        Update order status with validation and audit logging.

        Args:
            order_id: Order ID to update
            status_update: Dictionary containing status and optional notes
            seller_id: Seller ID for tenant isolation

        Returns:
            Updated Order instance or None if not found

        Raises:
            OrderNotFoundError: If order doesn't exist or access denied
            OrderValidationError: If status transition is invalid
        """
        try:
            # Get the order with tenant isolation
            order = await self._get_order_with_lock(order_id, seller_id)

            if not order:
                raise OrderNotFoundError(
                    f"Order {order_id} not found or access denied")

            new_status = status_update.get('status')
            if not new_status:
                raise OrderValidationError("Status is required")

            # Convert string to enum if needed
            if isinstance(new_status, str):
                try:
                    new_status = OrderStatus(new_status)
                except ValueError:
                    raise OrderValidationError(f"Invalid status: {new_status}")

            # Validate transition
            if not self.is_valid_transition(order.status, new_status):
                raise OrderValidationError(
                    f"Invalid status transition from {order.status} to {new_status}"
                )

            # Store previous status for audit
            previous_status = order.status

            # Update order
            order.status = new_status
            order.updated_at = datetime.utcnow()
            order.version += 1  # Optimistic locking

            # Handle status-specific updates
            if new_status == OrderStatus.cancelled:
                order.cancelled_at = datetime.utcnow()
                order.cancellation_reason = status_update.get(
                    'reason', 'Cancelled by seller')
            elif new_status == OrderStatus.returned:
                order.returned_at = datetime.utcnow()
                order.return_reason = status_update.get(
                    'reason', 'Returned by customer')

            # Update shipping details if provided
            if 'tracking_number' in status_update:
                # Note: This would require a shipping relationship, for now we'll add it as notes
                if not order.notes:
                    order.notes = f"Tracking: {status_update['tracking_number']}"
                else:
                    order.notes += f"\nTracking: {status_update['tracking_number']}"

            if 'shipping_carrier' in status_update:
                if not order.notes:
                    order.notes = f"Carrier: {status_update['shipping_carrier']}"
                else:
                    order.notes += f"\nCarrier: {status_update['shipping_carrier']}"

            # Commit the transaction
            await self.db.commit()

            # Create audit log
            await create_audit_log(
                db=self.db,
                user_id=seller_id,
                action=AuditActionType.UPDATE,
                resource_type="Order",
                resource_id=str(order_id),
                details={
                    'previous_status': previous_status.value,
                    'new_status': new_status.value,
                    'reason': status_update.get('reason'),
                    'notes': status_update.get('notes'),
                    'tracking_number': status_update.get('tracking_number'),
                    'shipping_carrier': status_update.get('shipping_carrier')
                }
            )

            # Emit domain event
            try:
                event = OrderEventFactory.create_status_changed_event(
                    order,
                    previous_status,
                    new_status
                )
                await self.event_bus.publish(event)
            except Exception as e:
                logger.warning(f"Failed to emit status change event: {str(e)}")

            logger.info(
                f"Updated order {order_id} status from {previous_status} to {new_status}")
            return order

        except Exception as e:
            await self.db.rollback()
            logger.error(
                f"Error updating order status for {order_id}: {str(e)}")
            if isinstance(e, (OrderNotFoundError, OrderValidationError)):
                raise
            raise AppError(f"Failed to update order status: {str(e)}")

    async def update_order_status_internal(
        self,
        order_id: UUID,
        seller_id: UUID,
        status: OrderStatus,
        tracking_number: Optional[str] = None,
        shipping_carrier: Optional[str] = None,
        reason: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Optional[Order]:
        """
        Internal method for updating order status with all parameters.

        Args:
            order_id: Order ID to update
            seller_id: Seller ID for tenant isolation
            status: New status
            tracking_number: Tracking number for shipments
            shipping_carrier: Shipping carrier name
            reason: Reason for status change
            notes: Additional notes

        Returns:
            Updated Order instance or None if not found
        """
        status_update = {
            'status': status,
            'tracking_number': tracking_number,
            'shipping_carrier': shipping_carrier,
            'reason': reason,
            'notes': notes
        }

        # Remove None values
        status_update = {k: v for k,
                         v in status_update.items() if v is not None}

        return await self.update_order_status(order_id, status_update, seller_id)

    def is_valid_transition(self, current_status: OrderStatus, new_status: OrderStatus) -> bool:
        """
        Check if a status transition is valid.

        Args:
            current_status: Current order status
            new_status: Desired new status

        Returns:
            True if transition is valid, False otherwise
        """
        if current_status == new_status:
            return True  # Same status is always valid

        valid_next_statuses = self.VALID_TRANSITIONS.get(current_status, [])
        return new_status in valid_next_statuses

    async def delete_order(self, order_id: UUID, seller_id: UUID) -> bool:
        """
        Soft delete an order (marks as deleted instead of removing from database).

        Args:
            order_id: Order ID to delete
            seller_id: Seller ID for tenant isolation

        Returns:
            True if successfully deleted, False otherwise

        Raises:
            OrderNotFoundError: If order doesn't exist or access denied
            OrderValidationError: If order cannot be deleted
        """
        try:
            # Get the order with tenant isolation
            order = await self._get_order_with_lock(order_id, seller_id)

            if not order:
                raise OrderNotFoundError(
                    f"Order {order_id} not found or access denied")

            # Check if order can be deleted (only pending orders can be deleted)
            if order.status != OrderStatus.pending:
                raise OrderValidationError(
                    f"Cannot delete order with status {order.status}. Only pending orders can be deleted."
                )

            # Soft delete the order
            order.is_deleted = True
            order.updated_at = datetime.utcnow()
            order.version += 1

            await self.db.commit()

            # Create audit log
            await create_audit_log(
                db=self.db,
                user_id=seller_id,
                action=AuditActionType.DELETE,
                resource_type="Order",
                resource_id=str(order_id),
                details={'action': 'soft_delete',
                         'reason': 'Deleted by seller'}
            )

            logger.info(f"Soft deleted order {order_id}")
            return True

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting order {order_id}: {str(e)}")
            if isinstance(e, (OrderNotFoundError, OrderValidationError)):
                raise
            raise AppError(f"Failed to delete order: {str(e)}")

    async def cancel_order(self, order_id: UUID, seller_id: UUID, reason: str = None) -> Optional[Order]:
        """
        Cancel an order if it's in a cancellable state.

        Args:
            order_id: Order ID to cancel
            seller_id: Seller ID for tenant isolation
            reason: Reason for cancellation

        Returns:
            Updated Order instance or None if not found

        Raises:
            OrderNotFoundError: If order doesn't exist or access denied
            OrderValidationError: If order cannot be cancelled
        """
        try:
            # Get the order with tenant isolation
            order = await self._get_order_with_lock(order_id, seller_id)

            if not order:
                raise OrderNotFoundError(
                    f"Order {order_id} not found or access denied")

            # Check if order can be cancelled
            if order.status not in self.CANCELLABLE_STATUSES:
                raise OrderValidationError(
                    f"Cannot cancel order with status {order.status}. "
                    f"Only orders in {[s.value for s in self.CANCELLABLE_STATUSES]} can be cancelled."
                )

            # Cancel the order
            status_update = {
                'status': OrderStatus.cancelled,
                'reason': reason or 'Cancelled by seller'
            }

            return await self.update_order_status(order_id, status_update, seller_id)

        except Exception as e:
            logger.error(f"Error cancelling order {order_id}: {str(e)}")
            if isinstance(e, (OrderNotFoundError, OrderValidationError)):
                raise
            raise AppError(f"Failed to cancel order: {str(e)}")

    async def bulk_update_status(
        self,
        order_ids: List[UUID],
        seller_id: UUID,
        new_status: OrderStatus,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update status for multiple orders in bulk.

        Args:
            order_ids: List of order IDs to update
            seller_id: Seller ID for tenant isolation
            new_status: New status to apply
            reason: Reason for status change

        Returns:
            Dictionary with success/failure counts and details
        """
        results = {
            'success_count': 0,
            'failure_count': 0,
            'failures': []
        }

        for order_id in order_ids:
            try:
                status_update = {
                    'status': new_status,
                    'reason': reason
                }

                await self.update_order_status(order_id, status_update, seller_id)
                results['success_count'] += 1

            except Exception as e:
                results['failure_count'] += 1
                results['failures'].append({
                    'order_id': str(order_id),
                    'error': str(e)
                })
                logger.error(
                    f"Failed to update order {order_id} in bulk operation: {str(e)}")

        logger.info(
            f"Bulk status update completed. Success: {results['success_count']}, Failures: {results['failure_count']}")
        return results

    async def get_status_history(self, order_id: UUID, seller_id: UUID) -> List[Dict[str, Any]]:
        """
        Get the status change history for an order.

        Args:
            order_id: Order ID
            seller_id: Seller ID for tenant isolation

        Returns:
            List of status change records
        """
        try:
            # First verify the order exists and user has access
            order = await self._get_order_with_lock(order_id, seller_id)
            if not order:
                raise OrderNotFoundError(
                    f"Order {order_id} not found or access denied")

            # Get audit logs for this order
            from app.app.models.audit.audit_log import AuditLog

            query = select(AuditLog).where(
                and_(
                    AuditLog.resource_type == "Order",
                    AuditLog.resource_id == str(order_id),
                    AuditLog.action == AuditActionType.UPDATE
                )
            ).order_by(AuditLog.created_at.desc())

            result = await self.db.execute(query)
            audit_logs = result.scalars().all()

            history = []
            for log in audit_logs:
                details = log.details or {}
                if 'previous_status' in details and 'new_status' in details:
                    history.append({
                        'timestamp': log.created_at.isoformat(),
                        'previous_status': details['previous_status'],
                        'new_status': details['new_status'],
                        'reason': details.get('reason'),
                        'notes': details.get('notes'),
                        'updated_by': str(log.user_id) if log.user_id else None
                    })

            return history

        except Exception as e:
            logger.error(
                f"Error getting status history for order {order_id}: {str(e)}")
            if isinstance(e, OrderNotFoundError):
                raise
            raise AppError(f"Failed to get status history: {str(e)}")

    async def _get_order_with_lock(self, order_id: UUID, seller_id: UUID) -> Optional[Order]:
        """
        Get an order with row-level locking for updates.

        Args:
            order_id: Order ID
            seller_id: Seller ID for tenant isolation

        Returns:
            Order instance or None if not found
        """
        query = select(Order).options(
            joinedload(Order.channel_metadata),
            joinedload(Order.items)
        ).where(
            and_(
                Order.id == order_id,
                Order.seller_id == seller_id,
                Order.is_deleted == False
            )
        ).with_for_update()  # Row-level lock for updates

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def can_transition_to(self, order_id: UUID, seller_id: UUID, new_status: OrderStatus) -> bool:
        """
        Check if an order can transition to a specific status.

        Args:
            order_id: Order ID
            seller_id: Seller ID for tenant isolation
            new_status: Desired status

        Returns:
            True if transition is possible, False otherwise
        """
        try:
            order = await self._get_order_with_lock(order_id, seller_id)
            if not order:
                return False

            return self.is_valid_transition(order.status, new_status)

        except Exception as e:
            logger.error(
                f"Error checking transition for order {order_id}: {str(e)}")
            return False

    def get_valid_next_statuses(self, current_status: OrderStatus) -> List[OrderStatus]:
        """
        Get list of valid next statuses for a given current status.

        Args:
            current_status: Current order status

        Returns:
            List of valid next statuses
        """
        return self.VALID_TRANSITIONS.get(current_status, [])

    def is_terminal_status(self, status: OrderStatus) -> bool:
        """
        Check if a status is terminal (no further transitions possible).

        Args:
            status: Status to check

        Returns:
            True if terminal, False otherwise
        """
        return len(self.VALID_TRANSITIONS.get(status, [])) == 0
