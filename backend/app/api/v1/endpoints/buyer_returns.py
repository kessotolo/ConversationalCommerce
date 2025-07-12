from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from backend.app.api.deps import get_db, get_current_buyer
from backend.app.schemas.order_return import (
    OrderReturnRequest,
    OrderReturnResponse,
    OrderCancellationRequest,
    OrderCancellationResponse
)
from backend.app.services.order_return_service import OrderReturnService
from backend.app.services.order_exceptions import OrderNotFoundError, OrderValidationError

router = APIRouter()


@router.post("/returns", response_model=OrderReturnResponse, status_code=status.HTTP_201_CREATED)
async def create_return_request(
    return_request: OrderReturnRequest,
    db: AsyncSession = Depends(get_db),
    buyer = Depends(get_current_buyer)
):
    """
    Create a new return request for an order.
    
    Only delivered orders can be returned.
    """
    try:
        return_service = OrderReturnService(db)
        return_obj = await return_service.create_return_request(
            return_request=return_request,
            customer_id=buyer.id,
            tenant_id=buyer.tenant_id
        )
        return return_obj
    except OrderNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except OrderValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/cancel/{order_id}", response_model=OrderCancellationResponse)
async def cancel_order(
    order_id: UUID,
    cancellation_request: OrderCancellationRequest,
    db: AsyncSession = Depends(get_db),
    buyer = Depends(get_current_buyer)
):
    """
    Cancel an order.
    
    Only pending, confirmed, or processing orders can be cancelled.
    """
    try:
        return_service = OrderReturnService(db)
        order = await return_service.cancel_order(
            order_id=order_id,
            reason=cancellation_request.reason,
            customer_id=buyer.id,
            tenant_id=buyer.tenant_id
        )
        
        # Convert to response model
        response = OrderCancellationResponse(
            order_id=order.id,
            status=order.status.value,
            cancellation_reason=order.cancellation_reason,
            cancelled_at=order.cancelled_at
        )
        return response
    except OrderNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except OrderValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/returns", response_model=List[OrderReturnResponse])
async def get_my_returns(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    buyer = Depends(get_current_buyer)
):
    """
    Get all return requests for the current buyer.
    """
    return_service = OrderReturnService(db)
    returns, _ = await return_service.get_order_returns(
        customer_id=buyer.id,
        tenant_id=buyer.tenant_id,
        limit=limit,
        offset=offset
    )
    return returns


@router.get("/returns/{return_id}", response_model=OrderReturnResponse)
async def get_return_details(
    return_id: UUID,
    db: AsyncSession = Depends(get_db),
    buyer = Depends(get_current_buyer)
):
    """
    Get details of a specific return request.
    """
    # Use SQLAlchemy to directly query for the specific return
    from sqlalchemy import select
    from backend.app.models.order_return import OrderReturn
    
    result = await db.execute(
        select(OrderReturn).where(
            OrderReturn.id == return_id,
            OrderReturn.customer_id == buyer.id,
            OrderReturn.tenant_id == buyer.tenant_id
        )
    )
    order_return = result.scalar_one_or_none()
    
    if not order_return:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Return request not found"
        )
    
    return order_return
