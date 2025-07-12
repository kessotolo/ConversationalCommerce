import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_db, get_current_buyer
from backend.app.schemas.order import PaginatedOrdersResponse, OrderResponse
from backend.app.services.order_service import OrderService, OrderNotFoundError

router = APIRouter()


@router.get("/", response_model=PaginatedOrdersResponse)
async def list_buyer_orders(
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    buyer=Depends(get_current_buyer),
):
    """Return orders for the authenticated buyer."""
    service = OrderService(db)
    try:
        orders, total = await service.get_orders_for_buyer(
            customer_id=uuid.UUID(str(buyer.id)),
            tenant_id=uuid.UUID(str(buyer.tenant_id)),
            limit=limit,
            offset=offset,
        )
    except OrderNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"items": orders, "total": total, "limit": limit, "offset": offset}
