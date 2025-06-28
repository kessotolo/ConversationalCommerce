from functools import wraps
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query

from app.core.security.clerk import ClerkTokenData
from app.core.security.dependencies import require_auth
from app.core.security.role_based_auth import RoleChecker, RoleType
from app.api.deps import get_db
from app.schemas.order import (
    OrderCreate,
    OrderResponse,
    OrderSearchParams,
    OrderStats,
    OrderStatusUpdate,
    OrderUpdate,
    PaginatedOrdersResponse,
    WhatsAppOrderCreate,
)
from app.services.order_service import (
    OrderError,
    OrderNotFoundError,
    OrderService,
    OrderValidationError,
)

router = APIRouter()

# Role checkers
require_seller = RoleChecker([RoleType.SELLER, RoleType.ADMIN])
require_admin = RoleChecker([RoleType.ADMIN])

# DRY error handler decorator


def handle_order_errors(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except OrderNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except OrderValidationError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except OrderError as e:
            raise HTTPException(status_code=500, detail=str(e))

    return wrapper


@router.post(
    "/orders",
    response_model=OrderResponse,
    status_code=201,
    summary="Create a new order",
    description="Create a new order for a product. Requires seller or admin role.",
)
@handle_order_errors
async def create_new_order(
    order_in: OrderCreate,
    db=Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
    _: bool = Depends(require_seller),
):
    service = OrderService(db)
    order = await service.create_order(order_in, seller_id=UUID(user.sub))
    return order


@router.post(
    "/orders/whatsapp",
    response_model=OrderResponse,
    status_code=201,
    summary="Create a new WhatsApp order",
    description="Create a new order from WhatsApp conversation. Requires seller or admin role.",
)
@handle_order_errors
async def create_whatsapp_order(
    order_in: WhatsAppOrderCreate,
    db=Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
    _: bool = Depends(require_seller),
):
    service = OrderService(db)
    order = await service.create_whatsapp_order(order_in, seller_id=UUID(user.sub))
    return order


@router.get(
    "/orders",
    response_model=PaginatedOrdersResponse,
    summary="List orders",
    description="List orders with various filter options. Requires seller or admin role.",
)
@handle_order_errors
async def list_orders(
    search_params: OrderSearchParams = Depends(),
    db=Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
    _: bool = Depends(require_seller),
):
    service = OrderService(db)
    orders, total = await service.get_orders(
        seller_id=UUID(user.sub),
        status=search_params.status,
        order_source=search_params.order_source,
        search=search_params.search,
        start_date=search_params.start_date,
        end_date=search_params.end_date,
        limit=search_params.limit,
        offset=search_params.offset,
    )
    return {
        "items": orders,
        "total": total,
        "limit": search_params.limit,
        "offset": search_params.offset,
    }


@router.get(
    "/orders/{order_id}",
    response_model=OrderResponse,
    summary="Get order details",
    description="Get detailed information about a specific order. Requires seller or admin role.",
)
@handle_order_errors
async def get_order_by_id(
    order_id: UUID = Path(..., description="The ID of the order to retrieve"),
    db=Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
    _: bool = Depends(require_seller),
):
    service = OrderService(db)
    order = await service.get_order(order_id=order_id, seller_id=UUID(user.sub))
    if not order:
        raise OrderNotFoundError("Order not found")
    return order


@router.put(
    "/orders/{order_id}",
    response_model=OrderResponse,
    summary="Update order",
    description="Update an order's information. Requires seller or admin role.",
)
@handle_order_errors
async def update_order_endpoint(
    order_id: UUID = Path(..., description="The ID of the order to update"),
    order_update: OrderUpdate = Body(...,
                                     description="The updated order information"),
    db=Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
    _: bool = Depends(require_seller),
):
    service = OrderService(db)
    order = await service.update_order(order_id, order_update, seller_id=UUID(user.sub))
    if not order:
        raise OrderNotFoundError("Order not found")
    return order


@router.patch(
    "/orders/{order_id}/status",
    response_model=OrderResponse,
    summary="Update order status",
    description="Update an order's status. Requires seller or admin role.",
)
@handle_order_errors
async def update_order_status_endpoint(
    order_id: UUID = Path(..., description="The ID of the order to update"),
    status_update: OrderStatusUpdate = Body(...,
                                            description="The new status details"),
    db=Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
    _: bool = Depends(require_seller),
):
    service = OrderService(db)
    order = await service.update_order_status(
        order_id, status_update, seller_id=UUID(user.sub)
    )
    if not order:
        raise OrderNotFoundError("Order not found")
    return order


@router.delete(
    "/orders/{order_id}",
    status_code=204,
    summary="Delete order",
    description="Soft delete an order. Requires seller or admin role.",
)
@handle_order_errors
async def delete_order_endpoint(
    order_id: UUID = Path(..., description="The ID of the order to delete"),
    db=Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
    _: bool = Depends(require_seller),
):
    service = OrderService(db)
    result = await service.delete_order(order_id=order_id, seller_id=UUID(user.sub))
    if not result:
        raise OrderNotFoundError("Order not found or could not be deleted")
    return None  # 204 No Content


@router.get(
    "/dashboard/orders/stats",
    response_model=OrderStats,
    summary="Get order statistics",
    description="Get statistics about orders for the seller dashboard. Requires seller or admin role.",
)
@handle_order_errors
async def get_order_stats(
    days: int = Query(
        30, description="Number of days to include in the statistics"),
    db=Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
    _: bool = Depends(require_seller),
):
    service = OrderService(db)
    return await service.get_seller_dashboard_stats(seller_id=UUID(user.sub), days=days)


@router.post(
    "/orders/{order_id}/notification",
    status_code=200,
    summary="Mark notification sent",
    description="Mark that a notification has been sent for an order. Requires seller or admin role.",
)
@handle_order_errors
async def mark_notification_sent_endpoint(
    order_id: UUID = Path(..., description="The ID of the order to mark"),
    db=Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
    _: bool = Depends(require_seller),
):
    service = OrderService(db)
    result = await service.mark_notification_sent(
        order_id=order_id, seller_id=UUID(user.sub)
    )
    if not result:
        raise OrderNotFoundError(
            "Order not found or could not mark notification sent")
    return {"success": True}
