"""
Admin Orders Endpoints

Merchant-specific order management for admin dashboard.
"""
import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security.dependencies import get_current_admin_or_seller
from app.core.security.clerk_multi_org import MultiOrgClerkTokenData
from app.db.deps import get_db
from app.models.order import OrderStatus, OrderSource
from app.schemas.order import (
    OrderCreate,
    OrderResponse,
    OrderUpdate,
    OrderStats,
    ModernOrderCreate,
)
from app.services.order_service import OrderService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=List[OrderResponse], summary="List all orders for the merchant")
async def list_orders(
    status: Optional[OrderStatus] = Query(
        None, description="Filter by order status"),
    order_source: Optional[OrderSource] = Query(
        None, description="Filter by order source"),
    search: Optional[str] = Query(
        None, description="Search by buyer name or phone"),
    limit: int = Query(100, ge=1, le=1000,
                       description="Number of orders to return"),
    offset: int = Query(0, ge=0, description="Number of orders to skip"),
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """List all orders for the current merchant (admin view)."""
    try:
        logger.info(f"Listing orders for user: {current_user.user_id}")

        # Initialize order service
        order_service = OrderService(db)

        # Get orders using the service layer
        orders = await order_service.get_orders(
            seller_id=UUID(current_user.user_id),
            status=status,
            order_source=order_source,
            search=search,
            limit=limit,
            offset=offset,
        )

        # Convert to response format
        return [OrderResponse.model_validate(order) for order in orders]
    except Exception as e:
        logger.error(f"Error listing orders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve orders",
        )


@router.get("/stats", response_model=OrderStats, summary="Get order statistics")
async def get_order_stats(
    period_days: int = Query(
        30, ge=1, le=365, description="Period in days for statistics"),
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Get order statistics for the merchant dashboard."""
    try:
        logger.info(f"Getting order stats for user: {current_user.user_id}")

        # Initialize order service
        order_service = OrderService(db)

        # Get orders for the specified period
        orders = await order_service.get_orders(
            seller_id=UUID(current_user.user_id),
            limit=10000,  # Get all orders for stats
        )

        # Calculate statistics
        total_orders = len(orders)
        total_revenue = sum(order.total_amount for order in orders)
        average_order_value = total_revenue / total_orders if total_orders > 0 else 0

        # Count orders by status
        orders_by_status = {}
        for order in orders:
            status_name = order.status.value if hasattr(
                order.status, 'value') else str(order.status)
            orders_by_status[status_name] = orders_by_status.get(
                status_name, 0) + 1

        # Count orders by source
        orders_by_source = {}
        for order in orders:
            source_name = order.order_source.value if hasattr(
                order.order_source, 'value') else str(order.order_source)
            orders_by_source[source_name] = orders_by_source.get(
                source_name, 0) + 1

        return OrderStats(
            total_orders=total_orders,
            total_revenue=total_revenue,
            average_order_value=average_order_value,
            recent_orders=total_orders,  # For now, all orders are considered recent
            orders_by_status=orders_by_status,
            orders_by_source=orders_by_source,
            period_days=period_days,
        )
    except Exception as e:
        logger.error(f"Error getting order stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve order statistics",
        )


@router.get("/{order_id}", response_model=OrderResponse, summary="Get order details")
async def get_order_detail(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Get details for a specific order (admin view)."""
    try:
        logger.info(
            f"Getting order {order_id} for user: {current_user.user_id}")

        # Initialize order service
        order_service = OrderService(db)

        # Get order using the service layer
        order = await order_service.get_order(order_id, seller_id=UUID(current_user.user_id))

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order with ID {order_id} not found",
            )

        return OrderResponse.model_validate(order)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting order {order_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve order",
        )


@router.post("/", response_model=OrderResponse, summary="Create a new order")
async def create_new_order(
    order_data: ModernOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Create a new order for the merchant (admin view)."""
    try:
        logger.info(f"Creating order for user: {current_user.user_id}")

        # Initialize order service
        order_service = OrderService(db)

        # Create order using the service layer
        order = await order_service.create_order(order_data, seller_id=UUID(current_user.user_id))

        logger.info(f"Order created successfully: {order.id}")
        return OrderResponse.model_validate(order)
    except Exception as e:
        logger.error(f"Error creating order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order",
        )


@router.put("/{order_id}", response_model=OrderResponse, summary="Update an order")
async def update_existing_order(
    order_id: UUID,
    order_data: OrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Update an existing order (admin view)."""
    try:
        logger.info(
            f"Updating order {order_id} for user: {current_user.user_id}")

        # Initialize order service
        order_service = OrderService(db)

        # First, get the order to verify ownership
        order = await order_service.get_order(order_id, seller_id=UUID(current_user.user_id))

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order with ID {order_id} not found",
            )

        # Update order fields
        update_data = order_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(order, field):
                setattr(order, field, value)

        # Save changes
        await db.commit()
        await db.refresh(order)

        logger.info(f"Order updated successfully: {order.id}")
        return OrderResponse.model_validate(order)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating order {order_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order",
        )


@router.delete("/{order_id}", summary="Delete an order")
async def delete_existing_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Delete an order (admin view)."""
    try:
        logger.info(
            f"Deleting order {order_id} for user: {current_user.user_id}")

        # Initialize order service
        order_service = OrderService(db)

        # First, get the order to verify ownership
        order = await order_service.get_order(order_id, seller_id=UUID(current_user.user_id))

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order with ID {order_id} not found",
            )

        # Soft delete the order
        order.is_deleted = True
        await db.commit()

        logger.info(f"Order deleted successfully: {order_id}")
        return {"message": "Order deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting order {order_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete order",
        )
