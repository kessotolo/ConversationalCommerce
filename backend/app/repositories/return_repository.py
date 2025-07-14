import uuid
from typing import List, Optional, Dict, Any

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.app.models.returns import ReturnRequest, ReturnItem, ReturnStatus
from app.app.models.order import Order, OrderItem
from app.app.schemas.returns import ReturnRequestCreate, ReturnRequestUpdate, ReturnItemUpdate


class ReturnRepository:
    """Repository for return request operations"""
    
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
    
    async def create_return_request(
        self, 
        tenant_id: uuid.UUID, 
        customer_id: uuid.UUID, 
        data: ReturnRequestCreate
    ) -> ReturnRequest:
        """
        Create a new return request with associated return items
        
        Args:
            tenant_id: The tenant ID
            customer_id: The customer ID
            data: Return request creation data
            
        Returns:
            The created return request
        """
        # Generate a return number (e.g., RET-12345)
        count_query = select(func.count()).select_from(ReturnRequest).where(
            ReturnRequest.tenant_id == tenant_id
        )
        count_result = await self.db_session.execute(count_query)
        count = count_result.scalar() or 0
        return_number = f"RET-{count + 1:05d}"
        
        # Create the return request
        return_request = ReturnRequest(
            tenant_id=tenant_id,
            customer_id=customer_id,
            order_id=data.order_id,
            return_number=return_number,
            reason=data.reason,
            explanation=data.explanation,
            return_shipping_required=data.return_shipping_required,
            return_address=data.return_address.dict() if data.return_address else None,
            status=ReturnStatus.REQUESTED
        )
        
        self.db_session.add(return_request)
        await self.db_session.flush()
        
        # Create associated return items
        for item_data in data.items:
            return_item = ReturnItem(
                tenant_id=tenant_id,
                return_request_id=return_request.id,
                order_item_id=item_data.order_item_id,
                quantity=item_data.quantity,
                reason=item_data.reason,
                item_condition=item_data.item_condition,
                customer_notes=item_data.customer_notes,
                status=ReturnStatus.REQUESTED
            )
            self.db_session.add(return_item)
        
        await self.db_session.commit()
        await self.db_session.refresh(return_request)
        
        return return_request
    
    async def get_return_request_by_id(
        self, 
        tenant_id: uuid.UUID, 
        return_id: uuid.UUID,
        include_items: bool = True
    ) -> Optional[ReturnRequest]:
        """
        Get a return request by ID
        
        Args:
            tenant_id: The tenant ID
            return_id: The return request ID
            include_items: Whether to include return items
            
        Returns:
            The return request or None if not found
        """
        query = select(ReturnRequest).where(
            ReturnRequest.id == return_id,
            ReturnRequest.tenant_id == tenant_id
        )
        
        if include_items:
            query = query.options(joinedload(ReturnRequest.return_items))
            
        result = await self.db_session.execute(query)
        return result.scalars().first()
    
    async def get_return_requests_by_order(
        self, 
        tenant_id: uuid.UUID, 
        order_id: uuid.UUID,
        include_items: bool = True
    ) -> List[ReturnRequest]:
        """
        Get all return requests for an order
        
        Args:
            tenant_id: The tenant ID
            order_id: The order ID
            include_items: Whether to include return items
            
        Returns:
            List of return requests
        """
        query = select(ReturnRequest).where(
            ReturnRequest.order_id == order_id,
            ReturnRequest.tenant_id == tenant_id
        )
        
        if include_items:
            query = query.options(joinedload(ReturnRequest.return_items))
            
        result = await self.db_session.execute(query)
        return result.scalars().all()
    
    async def get_return_requests_by_customer(
        self, 
        tenant_id: uuid.UUID, 
        customer_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Get all return requests for a customer with pagination
        
        Args:
            tenant_id: The tenant ID
            customer_id: The customer ID
            skip: Number of items to skip
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with items and total count
        """
        # Count total returns
        count_query = select(func.count()).select_from(ReturnRequest).where(
            ReturnRequest.customer_id == customer_id,
            ReturnRequest.tenant_id == tenant_id
        )
        count_result = await self.db_session.execute(count_query)
        total = count_result.scalar() or 0
        
        # Get paginated returns
        query = select(ReturnRequest).where(
            ReturnRequest.customer_id == customer_id,
            ReturnRequest.tenant_id == tenant_id
        ).options(
            joinedload(ReturnRequest.return_items)
        ).order_by(
            ReturnRequest.created_at.desc()
        ).offset(skip).limit(limit)
        
        result = await self.db_session.execute(query)
        items = result.scalars().all()
        
        return {
            "items": items,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    
    async def get_all_return_requests(
        self, 
        tenant_id: uuid.UUID,
        status: Optional[ReturnStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Get all return requests with pagination and optional filtering
        
        Args:
            tenant_id: The tenant ID
            status: Optional status filter
            skip: Number of items to skip
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with items and total count
        """
        # Build the where clause
        where_clause = [ReturnRequest.tenant_id == tenant_id]
        if status:
            where_clause.append(ReturnRequest.status == status)
        
        # Count total returns
        count_query = select(func.count()).select_from(ReturnRequest).where(*where_clause)
        count_result = await self.db_session.execute(count_query)
        total = count_result.scalar() or 0
        
        # Get paginated returns
        query = select(ReturnRequest).where(*where_clause).options(
            joinedload(ReturnRequest.return_items)
        ).order_by(
            ReturnRequest.created_at.desc()
        ).offset(skip).limit(limit)
        
        result = await self.db_session.execute(query)
        items = result.scalars().all()
        
        return {
            "items": items,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    
    async def update_return_request(
        self, 
        tenant_id: uuid.UUID, 
        return_id: uuid.UUID, 
        data: ReturnRequestUpdate
    ) -> Optional[ReturnRequest]:
        """
        Update a return request
        
        Args:
            tenant_id: The tenant ID
            return_id: The return request ID
            data: Return request update data
            
        Returns:
            The updated return request or None if not found
        """
        # Get the return request
        return_request = await self.get_return_request_by_id(tenant_id, return_id)
        if not return_request:
            return None
        
        # Update the return request with the provided fields
        update_data = data.dict(exclude_unset=True)
        for key, value in update_data.items():
            if hasattr(return_request, key):
                if key == "return_address" and value:
                    setattr(return_request, key, value.dict())
                else:
                    setattr(return_request, key, value)
        
        # If status changed to processed, update processed_at
        if data.status == ReturnStatus.APPROVED or data.status == ReturnStatus.REJECTED:
            return_request.processed_at = func.now()
        
        # If status changed to completed, update completed_at
        if data.status == ReturnStatus.COMPLETED:
            return_request.completed_at = func.now()
        
        await self.db_session.commit()
        await self.db_session.refresh(return_request)
        
        return return_request
    
    async def update_return_item(
        self, 
        tenant_id: uuid.UUID, 
        item_id: uuid.UUID, 
        data: ReturnItemUpdate
    ) -> Optional[ReturnItem]:
        """
        Update a return item
        
        Args:
            tenant_id: The tenant ID
            item_id: The return item ID
            data: Return item update data
            
        Returns:
            The updated return item or None if not found
        """
        # Get the return item
        query = select(ReturnItem).where(
            ReturnItem.id == item_id,
            ReturnItem.tenant_id == tenant_id
        )
        result = await self.db_session.execute(query)
        return_item = result.scalars().first()
        
        if not return_item:
            return None
        
        # Update the return item with the provided fields
        update_data = data.dict(exclude_unset=True)
        for key, value in update_data.items():
            if hasattr(return_item, key):
                setattr(return_item, key, value)
        
        # If item is being restocked, update restocked_at
        if data.restocked and not return_item.restocked_at:
            return_item.restocked_at = func.now()
        
        await self.db_session.commit()
        await self.db_session.refresh(return_item)
        
        return return_item
