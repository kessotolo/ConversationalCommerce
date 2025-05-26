from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date, datetime, timedelta
from typing import Optional, List

from app.core.security.dependencies import require_auth
from app.core.security.clerk import ClerkTokenData
from app.core.security.role_based_auth import RoleChecker, RoleType
from app.db.session import get_db
from app.services.order_service import (
    create_order,
    get_order,
    get_orders,
    update_order_status,
    delete_order,
    get_seller_dashboard_stats,
    mark_notification_sent
)
from app.schemas.order import (
    OrderCreate,
    WhatsAppOrderCreate,
    OrderResponse,
    OrderStatusUpdate,
    OrderSearchParams,
    OrderStats,
    PaginatedOrdersResponse
)
from fastapi import HTTPException, status
from app.models.order import OrderStatus, OrderSource

router = APIRouter()

# Role checkers
require_seller = RoleChecker([RoleType.SELLER, RoleType.ADMIN])
require_admin = RoleChecker([RoleType.ADMIN])


@router.post("/orders", 
         response_model=OrderResponse, 
         status_code=201,
         summary="Create a new order",
         description="Create a new order for a product. Requires seller or admin role.")
async def create_new_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
    _: bool = Depends(require_seller)
):
    """Create a new order with the provided details"""
    try:
        order = create_order(
            db=db,
            product_id=order_in.product_id,
            seller_id=UUID(user.sub),
            buyer_name=order_in.buyer_name,
            buyer_phone=order_in.buyer_phone,
            quantity=order_in.quantity,
            total_amount=order_in.total_amount,
            order_source=order_in.order_source,
            buyer_email=order_in.buyer_email,
            buyer_address=order_in.buyer_address,
            notes=order_in.notes
        )
        return order
    except ErrorResponse as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.post("/orders/whatsapp", 
         response_model=OrderResponse, 
         status_code=201,
         summary="Create a new WhatsApp order",
         description="Create a new order from WhatsApp conversation. Requires seller or admin role.")
async def create_whatsapp_order(
    order_in: WhatsAppOrderCreate,
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
    _: bool = Depends(require_seller)
):
    """Create a new order from WhatsApp with the provided details"""
    try:
        order = create_order(
            db=db,
            product_id=order_in.product_id,
            seller_id=UUID(user.sub),
            buyer_name=order_in.buyer_name,
            buyer_phone=order_in.buyer_phone,
            quantity=order_in.quantity,
            total_amount=order_in.total_amount,
            order_source=OrderSource.whatsapp,
            buyer_email=order_in.buyer_email,
            buyer_address=order_in.buyer_address,
            notes=order_in.notes,
            whatsapp_number=order_in.whatsapp_number,
            message_id=order_in.message_id,
            conversation_id=order_in.conversation_id
        )
        return order
    except ErrorResponse as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.get("/orders", 
        response_model=PaginatedOrdersResponse,
        summary="List orders",
        description="List orders with various filter options. Requires seller or admin role.")
async def list_orders(
    search_params: OrderSearchParams = Depends(),
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
    _: bool = Depends(require_seller)
):
    """List orders with filtering options"""
    # Convert date objects to datetime for service layer
    start_date = None
    if search_params.start_date:
        start_date = datetime.combine(search_params.start_date, datetime.min.time())
    
    end_date = None
    if search_params.end_date:
        end_date = datetime.combine(search_params.end_date, datetime.max.time())
    
    orders, total = get_orders(
        db=db,
        seller_id=UUID(user.sub),
        status=search_params.status,
        order_source=search_params.order_source,
        search=search_params.search,
        start_date=start_date,
        end_date=end_date,
        limit=search_params.limit,
        offset=search_params.offset
    )
    
    return {
        "items": orders,
        "total": total,
        "limit": search_params.limit,
        "offset": search_params.offset
    }


@router.get("/orders/{order_id}", 
        response_model=OrderResponse,
        summary="Get order details",
        description="Get detailed information about a specific order. Requires seller or admin role.")
async def get_order_by_id(
    order_id: UUID = Path(..., description="The ID of the order to retrieve"),
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
    _: bool = Depends(require_seller)
):
    """Get a specific order by ID"""
    order = get_order(db=db, order_id=order_id, seller_id=UUID(user.sub))
    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )
    return order


@router.patch("/orders/{order_id}/status", 
          response_model=OrderResponse,
          summary="Update order status",
          description="Update an order's status. Requires seller or admin role.")
async def update_order_status_endpoint(
    order_id: UUID = Path(..., description="The ID of the order to update"),
    status_update: OrderStatusUpdate = Body(..., description="The new status details"),
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
    _: bool = Depends(require_seller)
):
    """Update an order's status"""
    try:
        order = update_order_status(
            db=db,
            order_id=order_id,
            seller_id=UUID(user.sub),
            status=status_update.status,
            tracking_number=status_update.tracking_number,
            shipping_carrier=status_update.shipping_carrier
        )
        
        if not order:
            raise HTTPException(
                status_code=404,
                detail="Order not found"
            )
            
        return order
    except HTTPException:
        # Re-raise HTTP exceptions directly
        raise
    except Exception as e:
        # Handle any other exceptions
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/orders/{order_id}", 
           status_code=204,
           summary="Delete order",
           description="Soft delete an order. Requires seller or admin role.")
async def delete_order_endpoint(
    order_id: UUID = Path(..., description="The ID of the order to delete"),
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
    _: bool = Depends(require_seller)
):
    """Soft delete an order"""
    success = delete_order(
        db=db,
        order_id=order_id,
        seller_id=UUID(user.sub)
    )
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Order not found or could not be deleted"
        )
    
    return None  # 204 No Content


@router.get("/dashboard/orders/stats", 
        response_model=OrderStats,
        summary="Get order statistics",
        description="Get statistics about orders for the seller dashboard. Requires seller or admin role.")
async def get_order_stats(
    days: int = Query(30, description="Number of days to include in the statistics"),
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
    _: bool = Depends(require_seller)
):
    """Get order statistics for the seller dashboard"""
    stats = get_seller_dashboard_stats(
        db=db,
        seller_id=UUID(user.sub),
        days=days
    )
    
    return stats


@router.post("/orders/{order_id}/notification",
         status_code=200,
         summary="Mark notification sent",
         description="Mark that a notification has been sent for an order. Requires seller or admin role.")
async def mark_notification_sent_endpoint(
    order_id: UUID = Path(..., description="The ID of the order to mark"),
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
    _: bool = Depends(require_seller)
):
    """Mark that a notification has been sent for an order"""
    success = mark_notification_sent(
        db=db,
        order_id=order_id,
        seller_id=UUID(user.sub)
    )
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )
    
    return {"message": "Notification marked as sent successfully"}
