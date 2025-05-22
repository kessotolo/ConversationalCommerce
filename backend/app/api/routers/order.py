from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.core.security.dependencies import require_auth
from app.db.session import get_db
from app.models.order import Order, OrderStatus, OrderSource
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse, WhatsAppOrderCreate

router = APIRouter()


@router.post("/orders", response_model=OrderResponse)
async def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    user=Depends(require_auth)
):
    """
    Create a new order. This endpoint supports orders from multiple sources:
    - Website/storefront (order_source=OrderSource.website)
    - WhatsApp (order_source=OrderSource.whatsapp)
    - Instagram (order_source=OrderSource.instagram)

    For WhatsApp-specific orders, use the /orders/whatsapp endpoint instead.
    """
    try:
        db_order = Order(
            product_id=order.product_id,
            buyer_name=order.buyer_name,
            buyer_phone=order.buyer_phone,
            buyer_email=order.buyer_email,
            buyer_address=order.buyer_address,
            order_source=order.order_source,  # Can be website, whatsapp, or instagram
            quantity=order.quantity,
            total_amount=order.total_amount,
            notes=order.notes
        )
        db.add(db_order)
        db.commit()
        db.refresh(db_order)
        return db_order
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating order: {str(e)}"
        )


@router.post("/orders/whatsapp", response_model=OrderResponse)
async def create_whatsapp_order(
    order: WhatsAppOrderCreate,
    db: Session = Depends(get_db),
    user=Depends(require_auth)
):
    """
    Create an order directly from WhatsApp.
    This endpoint is designed to be called by the WhatsApp webhook.
    """
    try:
        db_order = Order(
            product_id=order.product_id,
            buyer_name=order.buyer_name,
            buyer_phone=order.buyer_phone,
            whatsapp_number=order.whatsapp_number,
            message_id=order.message_id,
            conversation_id=order.conversation_id,
            quantity=order.quantity,
            total_amount=order.total_amount,
            order_source=OrderSource.whatsapp,
            notes=order.notes
        )
        db.add(db_order)
        db.commit()
        db.refresh(db_order)
        return db_order
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating WhatsApp order: {str(e)}"
        )


@router.get("/orders/whatsapp/{whatsapp_number}", response_model=List[OrderResponse])
async def get_whatsapp_orders(
    whatsapp_number: str,
    status: Optional[OrderStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_auth)
):
    """
    Get orders for a specific WhatsApp number.
    This is useful for showing order history in WhatsApp chat.
    """
    try:
        query = db.query(Order).filter(
            Order.whatsapp_number == whatsapp_number)
        if status:
            query = query.filter(Order.status == status)
        orders = query.order_by(Order.created_at.desc()).offset(
            skip).limit(limit).all()
        return orders
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching WhatsApp orders: {str(e)}"
        )


@router.get("/orders", response_model=List[OrderResponse])
async def list_orders(
    status: Optional[OrderStatus] = None,
    source: Optional[OrderSource] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_auth)
):
    try:
        query = db.query(Order)
        if status:
            query = query.filter(Order.status == status)
        if source:
            query = query.filter(Order.order_source == source)
        orders = query.order_by(Order.created_at.desc()).offset(
            skip).limit(limit).all()
        return orders
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching orders: {str(e)}"
        )


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(require_auth)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )
    return order


@router.put("/orders/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: UUID,
    order_update: OrderUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_auth)
):
    db_order = db.query(Order).filter(Order.id == order_id).first()
    if not db_order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    try:
        for field, value in order_update.dict(exclude_unset=True).items():
            setattr(db_order, field, value)

        db.commit()
        db.refresh(db_order)
        return db_order
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error updating order: {str(e)}"
        )


@router.delete("/orders/{order_id}", response_model=OrderResponse)
async def delete_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(require_auth)
):
    db_order = db.query(Order).filter(Order.id == order_id).first()
    if not db_order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    try:
        db.delete(db_order)
        db.commit()
        return db_order
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting order: {str(e)}"
        )
