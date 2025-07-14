from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from app.app.api.deps import get_db, get_current_admin
from app.app.models.order_return import OrderReturn
from app.app.schemas.order_return import (
    OrderReturnResponse,
    OrderReturnUpdate
)
from app.app.services.order_return_service import OrderReturnService
from app.app.services.order_exceptions import OrderNotFoundError, OrderValidationError

router = APIRouter()


@router.get("/returns", response_model=List[OrderReturnResponse])
async def get_all_returns(
    tenant_id: UUID,
    status: Optional[str] = None,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """
    Get all return requests for a tenant.
    Only accessible by admins.
    """
    query = select(OrderReturn).where(OrderReturn.tenant_id == tenant_id)
    
    if status:
        query = query.where(OrderReturn.return_status == status)
    
    # Count total
    result = await db.execute(query)
    total = len(result.scalars().all())
    
    # Get paginated results
    query = query.order_by(OrderReturn.requested_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    returns = result.scalars().all()
    
    return returns


@router.get("/returns/{return_id}", response_model=OrderReturnResponse)
async def get_return_details(
    return_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """
    Get details of a specific return request.
    Only accessible by admins.
    """
    result = await db.execute(
        select(OrderReturn).where(OrderReturn.id == return_id)
    )
    order_return = result.scalar_one_or_none()
    
    if not order_return:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Return request not found"
        )
    
    return order_return


@router.patch("/returns/{return_id}", response_model=OrderReturnResponse)
async def update_return_status(
    return_id: UUID,
    status_update: OrderReturnUpdate,
    tenant_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """
    Update the status of a return request.
    Only accessible by admins.
    
    Status transitions:
    - requested -> approved/rejected
    - approved -> in_transit/received
    - in_transit -> received
    - received -> refunded
    - refunded -> closed
    - rejected -> closed
    """
    try:
        return_service = OrderReturnService(db)
        updated_return = await return_service.update_return_status(
            return_id=return_id,
            status_update=status_update,
            admin_id=admin.id,
            tenant_id=tenant_id
        )
        return updated_return
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
