from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Body, Query, Path, status
from sqlalchemy.orm import Session

from app.domain.models.order import (
    Order, 
    OrderResponse, 
    OrdersResponse,
    CreateOrderRequest,
    OrderStatus,
    PaymentMethod,
    PaymentStatus
)
from app.domain.events.event_bus import get_event_bus
from app.domain.events.order_events import OrderEventFactory
from app.database import get_db
from app.dependencies import get_current_tenant, get_current_user
from app.utils.idempotency import IdempotencyKey, ensure_idempotent

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
@ensure_idempotent(key_ttl_seconds=86400)  # 24 hour idempotency window
async def create_order(
    request: CreateOrderRequest,
    db: Session = Depends(get_db),
    idempotency_key: IdempotencyKey = Depends(),
    tenant_id: str = Depends(get_current_tenant),
    current_user_id: Optional[str] = Depends(get_current_user)
):
    """
    Create a new order with complete details.
    
    This endpoint supports both web checkout and conversational commerce channels.
    It implements idempotency to prevent duplicate orders in case of network issues.
    """
    # Ensure tenant_id matches the authenticated tenant
    if request.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant ID mismatch"
        )
    
    # Generate unique order number
    from datetime import datetime
    import random
    order_number = f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
    
    # Calculate totals
    subtotal = sum(item.total_price.amount for item in request.items)
    tax_amount = subtotal * 0.16  # Example: 16% tax
    total_amount = subtotal + tax_amount + request.shipping.shipping_cost.amount
    
    # Create order domain model
    order = Order(
        id=str(UUID(int=0)),  # Will be replaced by database
        tenant_id=tenant_id,
        order_number=order_number,
        customer=request.customer,
        items=request.items,
        subtotal={"amount": subtotal, "currency": request.items[0].unit_price.currency},
        tax={"amount": tax_amount, "currency": request.items[0].unit_price.currency},
        total_amount={"amount": total_amount, "currency": request.items[0].unit_price.currency},
        status=OrderStatus.PENDING,
        source=request.source,
        shipping=request.shipping,
        payment=request.payment,
        notes=request.notes,
        metadata=request.metadata,
        idempotency_key=request.idempotency_key or idempotency_key.key,
        timeline=[{
            "status": OrderStatus.PENDING,
            "note": "Order created",
            "created_by": current_user_id
        }]
    )
    
    # Here we would persist to database
    # For demo purposes, just setting an ID
    import uuid
    order.id = str(uuid.uuid4())
    
    # Publish order created event
    event_bus = get_event_bus()
    event = OrderEventFactory.create_order_created_event(order)
    await event_bus.publish(event)
    
    return OrderResponse(order=order)

@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID = Path(..., description="Order ID"),
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant)
):
    """
    Get an order by ID with tenant isolation.
    """
    # Here we would fetch from database with tenant isolation
    # For demo purposes returning a dummy response
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Order not found"
    )

@router.get("/", response_model=OrdersResponse)
async def list_orders(
    status: Optional[OrderStatus] = Query(None, description="Filter by order status"),
    customer_phone: Optional[str] = Query(None, description="Filter by customer phone"),
    customer_email: Optional[str] = Query(None, description="Filter by customer email"),
    limit: int = Query(20, ge=1, le=100, description="Number of orders to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant)
):
    """
    List orders with filtering and pagination.
    
    Supports filtering by status, customer info, and pagination parameters.
    """
    # Here we would fetch from database with tenant isolation and filtering
    # For demo purposes returning an empty list
    return OrdersResponse(orders=[], total=0, page=1, limit=limit)

@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: UUID,
    status: OrderStatus = Body(..., embed=True),
    notes: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant),
    current_user_id: Optional[str] = Depends(get_current_user)
):
    """
    Update an order's status with event publishing.
    """
    # Here we would update the order in database
    # For demo purposes, returning error
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Order not found"
    )

@router.post("/{order_id}/payments", response_model=OrderResponse)
async def process_payment(
    order_id: UUID,
    payment_method: PaymentMethod = Body(..., embed=True),
    amount: float = Body(..., embed=True),
    transaction_id: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant),
    current_user_id: Optional[str] = Depends(get_current_user)
):
    """
    Process a payment for an order with event publishing.
    """
    # Here we would process payment in database
    # For demo purposes, returning error
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Order not found"
    )

@router.post("/{order_id}/shipping", response_model=OrderResponse)
async def update_shipping(
    order_id: UUID,
    tracking_number: str = Body(..., embed=True),
    shipping_provider: str = Body(..., embed=True),
    estimated_delivery: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant),
    current_user_id: Optional[str] = Depends(get_current_user)
):
    """
    Update shipping information for an order with event publishing.
    """
    # Here we would update shipping in database
    # For demo purposes, returning error
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Order not found"
    )

@router.get("/{order_id}/timeline", response_model=List)
async def get_order_timeline(
    order_id: UUID,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant)
):
    """
    Get the complete timeline of an order.
    """
    # Here we would fetch timeline from database
    # For demo purposes, returning empty list
    return []

@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: UUID,
    reason: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant),
    current_user_id: Optional[str] = Depends(get_current_user)
):
    """
    Cancel an order with event publishing.
    """
    # Here we would cancel order in database
    # For demo purposes, returning error
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Order not found"
    )
