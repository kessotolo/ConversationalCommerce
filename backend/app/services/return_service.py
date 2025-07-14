import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.app.models.returns import ReturnRequest, ReturnItem, ReturnStatus, ReturnReason
from app.app.models.order import Order, OrderItem
from app.app.schemas.returns import ReturnRequestCreate, ReturnRequestUpdate, ReturnItemUpdate
from app.app.repositories.return_repository import ReturnRepository
from app.app.repositories.order_repository import OrderRepository


class ReturnService:
    """Service for managing return requests"""
    
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        self.return_repository = ReturnRepository(db_session)
        self.order_repository = OrderRepository(db_session)
    
    async def create_return_request(
        self, 
        tenant_id: uuid.UUID, 
        customer_id: uuid.UUID, 
        data: ReturnRequestCreate
    ) -> ReturnRequest:
        """
        Create a new return request
        
        Args:
            tenant_id: The tenant ID
            customer_id: The customer ID
            data: Return request creation data
            
        Returns:
            The created return request
            
        Raises:
            HTTPException: If validation fails
        """
        # Verify the order exists and belongs to this customer
        order = await self.order_repository.get_order_by_id(
            tenant_id=tenant_id,
            order_id=data.order_id
        )
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        if order.customer_id != customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot create return request for an order that doesn't belong to you"
            )
        
        # Check if the order is in a valid state for returns
        valid_statuses = ["delivered", "completed"]
        if order.status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot create return request for order with status '{order.status}'. Order must be in one of these statuses: {valid_statuses}"
            )
        
        # Check if return window has expired (e.g., 30 days)
        if order.delivered_at:
            delivered_date = order.delivered_at
            today = datetime.utcnow()
            days_since_delivery = (today - delivered_date).days
            
            if days_since_delivery > 30:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Return window has expired. Returns must be requested within 30 days of delivery."
                )
        
        # Get all order items to validate return items
        order_items = await self.order_repository.get_order_items(
            tenant_id=tenant_id,
            order_id=data.order_id
        )
        
        order_items_dict = {str(item.id): item for item in order_items}
        
        # Validate each return item
        for item in data.items:
            item_id_str = str(item.order_item_id)
            
            # Check if the item exists in the order
            if item_id_str not in order_items_dict:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Item with ID {item_id_str} is not part of this order"
                )
            
            order_item = order_items_dict[item_id_str]
            
            # Check if the quantity is valid
            if item.quantity > order_item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot return more items than originally ordered. Requested: {item.quantity}, Available: {order_item.quantity}"
                )
            
            # Check if the item has already been returned
            if order_item.returned_quantity and item.quantity > (order_item.quantity - order_item.returned_quantity):
                available_quantity = order_item.quantity - order_item.returned_quantity
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot return more items than available. Requested: {item.quantity}, Available: {available_quantity}"
                )
        
        # Create the return request
        return_request = await self.return_repository.create_return_request(
            tenant_id=tenant_id,
            customer_id=customer_id,
            data=data
        )
        
        # Update order items to mark them as returned
        for item in data.items:
            order_item = order_items_dict[str(item.order_item_id)]
            current_returned = order_item.returned_quantity or 0
            new_returned = current_returned + item.quantity
            
            # Update the order item's returned quantity
            await self.order_repository.update_order_item(
                tenant_id=tenant_id,
                item_id=item.order_item_id,
                data={
                    "returned_quantity": new_returned
                }
            )
        
        return return_request
    
    async def get_return_request(
        self, 
        tenant_id: uuid.UUID, 
        return_id: uuid.UUID
    ) -> ReturnRequest:
        """
        Get a return request by ID
        
        Args:
            tenant_id: The tenant ID
            return_id: The return request ID
            
        Returns:
            The return request
            
        Raises:
            HTTPException: If the return request is not found
        """
        return_request = await self.return_repository.get_return_request_by_id(
            tenant_id=tenant_id,
            return_id=return_id
        )
        
        if not return_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Return request not found"
            )
        
        return return_request
    
    async def get_customer_return_requests(
        self, 
        tenant_id: uuid.UUID, 
        customer_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Get all return requests for a customer
        
        Args:
            tenant_id: The tenant ID
            customer_id: The customer ID
            skip: Number of items to skip
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with items and total count
        """
        return await self.return_repository.get_return_requests_by_customer(
            tenant_id=tenant_id,
            customer_id=customer_id,
            skip=skip,
            limit=limit
        )
    
    async def get_all_return_requests(
        self, 
        tenant_id: uuid.UUID,
        status: Optional[ReturnStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Get all return requests (admin)
        
        Args:
            tenant_id: The tenant ID
            status: Optional status filter
            skip: Number of items to skip
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with items and total count
        """
        return await self.return_repository.get_all_return_requests(
            tenant_id=tenant_id,
            status=status,
            skip=skip,
            limit=limit
        )
    
    async def update_return_request(
        self, 
        tenant_id: uuid.UUID, 
        return_id: uuid.UUID, 
        data: ReturnRequestUpdate,
        user_id: Optional[uuid.UUID] = None
    ) -> ReturnRequest:
        """
        Update a return request
        
        Args:
            tenant_id: The tenant ID
            return_id: The return request ID
            data: Return request update data
            user_id: ID of the user performing the update
            
        Returns:
            The updated return request
            
        Raises:
            HTTPException: If the return request is not found or cannot be updated
        """
        # Get the return request
        return_request = await self.get_return_request(tenant_id, return_id)
        
        # If status is being changed to approved or rejected, set approved_by
        if data.status in [ReturnStatus.APPROVED, ReturnStatus.REJECTED] and user_id:
            data.approved_by = user_id
        
        # Update the return request
        updated_request = await self.return_repository.update_return_request(
            tenant_id=tenant_id,
            return_id=return_id,
            data=data
        )
        
        # If status is updated to APPROVED, also update all return items
        if data.status == ReturnStatus.APPROVED:
            for item in return_request.return_items:
                await self.return_repository.update_return_item(
                    tenant_id=tenant_id,
                    item_id=item.id,
                    data=ReturnItemUpdate(
                        status=ReturnStatus.APPROVED
                    )
                )
        
        return updated_request
    
    async def update_return_item(
        self, 
        tenant_id: uuid.UUID, 
        return_id: uuid.UUID,
        item_id: uuid.UUID, 
        data: ReturnItemUpdate
    ) -> ReturnItem:
        """
        Update a return item
        
        Args:
            tenant_id: The tenant ID
            return_id: The return request ID
            item_id: The return item ID
            data: Return item update data
            
        Returns:
            The updated return item
            
        Raises:
            HTTPException: If the return item is not found or cannot be updated
        """
        # Get the return request to check if item belongs to it
        return_request = await self.get_return_request(tenant_id, return_id)
        
        # Find the item in the return request
        item_found = False
        for item in return_request.return_items:
            if item.id == item_id:
                item_found = True
                break
        
        if not item_found:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Return item not found in this return request"
            )
        
        # Update the return item
        updated_item = await self.return_repository.update_return_item(
            tenant_id=tenant_id,
            item_id=item_id,
            data=data
        )
        
        if not updated_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Return item not found"
            )
        
        # Check if we need to update the parent return request status
        if data.status:
            # Get all items to check their statuses
            return_request = await self.get_return_request(tenant_id, return_id)
            item_statuses = [item.status for item in return_request.return_items]
            
            # If all items are approved, update the request status
            if all(status == ReturnStatus.APPROVED.value for status in item_statuses):
                await self.update_return_request(
                    tenant_id=tenant_id,
                    return_id=return_id,
                    data=ReturnRequestUpdate(status=ReturnStatus.APPROVED)
                )
            # If all items are complete, update the request status
            elif all(status == ReturnStatus.COMPLETED.value for status in item_statuses):
                await self.update_return_request(
                    tenant_id=tenant_id,
                    return_id=return_id,
                    data=ReturnRequestUpdate(status=ReturnStatus.COMPLETED)
                )
            # If some items are approved and some are rejected
            elif ReturnStatus.APPROVED.value in item_statuses and ReturnStatus.REJECTED.value in item_statuses:
                await self.update_return_request(
                    tenant_id=tenant_id,
                    return_id=return_id,
                    data=ReturnRequestUpdate(status=ReturnStatus.PARTIAL_APPROVED)
                )
        
        return updated_item
    
    async def cancel_return_request(
        self, 
        tenant_id: uuid.UUID, 
        customer_id: uuid.UUID, 
        return_id: uuid.UUID
    ) -> ReturnRequest:
        """
        Cancel a return request (customer only)
        
        Args:
            tenant_id: The tenant ID
            customer_id: The customer ID
            return_id: The return request ID
            
        Returns:
            The cancelled return request
            
        Raises:
            HTTPException: If the return request is not found or cannot be cancelled
        """
        # Get the return request
        return_request = await self.get_return_request(tenant_id, return_id)
        
        # Check if the customer owns this return request
        if return_request.customer_id != customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot cancel a return request that doesn't belong to you"
            )
        
        # Check if the return request can be cancelled
        if return_request.status not in [ReturnStatus.REQUESTED.value, ReturnStatus.UNDER_REVIEW.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel return request with status '{return_request.status}'"
            )
        
        # Update the return request and all its items
        updated_request = await self.return_repository.update_return_request(
            tenant_id=tenant_id,
            return_id=return_id,
            data=ReturnRequestUpdate(
                status=ReturnStatus.CANCELLED
            )
        )
        
        # Update all return items to cancelled
        for item in return_request.return_items:
            await self.return_repository.update_return_item(
                tenant_id=tenant_id,
                item_id=item.id,
                data=ReturnItemUpdate(
                    status=ReturnStatus.CANCELLED
                )
            )
            
            # Restore the returned_quantity on the order item
            order_item = await self.order_repository.get_order_item(
                tenant_id=tenant_id,
                item_id=item.order_item_id
            )
            
            if order_item and order_item.returned_quantity:
                new_returned = max(0, order_item.returned_quantity - item.quantity)
                
                await self.order_repository.update_order_item(
                    tenant_id=tenant_id,
                    item_id=item.order_item_id,
                    data={
                        "returned_quantity": new_returned
                    }
                )
        
        return updated_request
