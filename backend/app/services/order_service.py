from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func, select, update
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta

from app.models.order import Order, OrderStatus, OrderSource
from app.models.product import Product
from app.models.user import User
from app.services.audit_service import create_audit_log, AuditActionType
from fastapi import HTTPException, status

def create_order(
    db: Session,
    product_id: UUID,
    seller_id: UUID,
    buyer_name: str,
    buyer_phone: str,
    quantity: int,
    total_amount: float,
    order_source: OrderSource = OrderSource.whatsapp,
    buyer_email: Optional[str] = None,
    buyer_address: Optional[str] = None,
    notes: Optional[str] = None,
    whatsapp_number: Optional[str] = None,
    message_id: Optional[str] = None,
    conversation_id: Optional[str] = None
) -> Order:
    """
    Create a new order
    """
    # Verify product exists and belongs to the seller
    product = db.query(Product).filter(
        and_(
            Product.id == product_id,
            Product.seller_id == seller_id,
            Product.is_deleted.is_(False)
        )
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or does not belong to the seller"
        )
    
    # Create the order
    order = Order(
        product_id=product_id,
        seller_id=seller_id,
        buyer_name=buyer_name,
        buyer_phone=buyer_phone,
        buyer_email=buyer_email,
        buyer_address=buyer_address,
        quantity=quantity,
        total_amount=total_amount,
        order_source=order_source,
        notes=notes,
        whatsapp_number=whatsapp_number,
        message_id=message_id,
        conversation_id=conversation_id
    )
    
    try:
        db.add(order)
        db.commit()
        db.refresh(order)
        
        # Log the audit event
        create_audit_log(
            db=db,
            user_id=seller_id,
            action=AuditActionType.CREATE,
            resource_type="Order",
            resource_id=str(order.id),
            details=f"Created order for product {product_id}"
        )
        
        return order
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create order due to database constraint: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the order: {str(e)}"
        )

def get_order(
    db: Session,
    order_id: UUID,
    seller_id: UUID
) -> Optional[Order]:
    """
    Get an order by ID, ensuring it belongs to the specified seller
    """
    return db.query(Order).filter(
        and_(
            Order.id == order_id,
            Order.seller_id == seller_id,
            Order.is_deleted.is_(False)
        )
    ).first()

def get_orders(
    db: Session,
    seller_id: UUID,
    status: Optional[OrderStatus] = None,
    order_source: Optional[OrderSource] = None,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0
) -> Tuple[List[Order], int]:
    """
    Get orders for a seller with filtering options
    Returns a tuple of (orders, total_count)
    """
    query = db.query(Order).filter(
        and_(
            Order.seller_id == seller_id,
            Order.is_deleted.is_(False)
        )
    )
    
    # Apply filters if provided
    if status:
        query = query.filter(Order.status == status)
    
    if order_source:
        query = query.filter(Order.order_source == order_source)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Order.buyer_name.ilike(search_term),
                Order.buyer_phone.ilike(search_term),
                Order.buyer_email.ilike(search_term)
            )
        )
    
    if start_date:
        query = query.filter(Order.created_at >= start_date)
    
    if end_date:
        query = query.filter(Order.created_at <= end_date)
    
    # Get total count for pagination
    total_count = query.count()
    
    # Apply pagination and ordering
    query = query.order_by(desc(Order.created_at)).offset(offset).limit(limit)
    
    return query.all(), total_count

def update_order_status(
    db: Session,
    order_id: UUID,
    seller_id: UUID,
    status: OrderStatus,
    tracking_number: Optional[str] = None,
    shipping_carrier: Optional[str] = None
) -> Optional[Order]:
    """
    Update an order's status with optimistic locking to prevent concurrent modifications
    """
    # First get the order to check if it exists and belongs to the seller
    order = get_order(db, order_id, seller_id)
    
    if not order:
        return None
    
    # Store current version for optimistic locking
    current_version = order.version
    
    # Prepare update data
    update_data = {
        "status": status,
        "updated_at": datetime.utcnow(),
        "version": current_version + 1
    }
    
    # Add tracking info if provided and status is shipped
    if status == OrderStatus.shipped:
        if tracking_number:
            update_data["tracking_number"] = tracking_number
        if shipping_carrier:
            update_data["shipping_carrier"] = shipping_carrier
    
    # Execute update with version check to prevent concurrent modifications
    result = db.execute(
        update(Order)
        .where(
            and_(
                Order.id == order_id,
                Order.seller_id == seller_id,
                Order.version == current_version
            )
        )
        .values(**update_data)
    )
    
    if result.rowcount == 0:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Order was modified by another process. Please refresh and try again."
        )
    
    db.commit()
    
    # Log the audit event
    create_audit_log(
        db=db,
        user_id=seller_id,
        action=AuditActionType.UPDATE,
        resource_type="Order",
        resource_id=str(order_id),
        details=f"Updated order status to {status.value}"
    )
    
    # Refresh order from database
    return get_order(db, order_id, seller_id)

def delete_order(
    db: Session,
    order_id: UUID,
    seller_id: UUID
) -> bool:
    """
    Soft delete an order (mark as deleted)
    """
    order = get_order(db, order_id, seller_id)
    
    if not order:
        return False
    
    # Store current version for optimistic locking
    current_version = order.version
    
    # Execute update with version check to prevent concurrent modifications
    result = db.execute(
        update(Order)
        .where(
            and_(
                Order.id == order_id,
                Order.seller_id == seller_id,
                Order.version == current_version
            )
        )
        .values(
            is_deleted=True,
            updated_at=datetime.utcnow(),
            version=current_version + 1
        )
    )
    
    if result.rowcount == 0:
        db.rollback()
        return False
    
    db.commit()
    
    # Log the audit event
    create_audit_log(
        db=db,
        user_id=seller_id,
        action=AuditActionType.DELETE,
        resource_type="Order",
        resource_id=str(order_id),
        details="Soft deleted order"
    )
    
    return True

def get_seller_dashboard_stats(
    db: Session,
    seller_id: UUID,
    days: int = 30
) -> Dict[str, Any]:
    """
    Get dashboard statistics for a seller
    """
    # Calculate the start date for the time period
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get total orders and total revenue
    orders_query = db.query(
        func.count(Order.id).label("total_orders"),
        func.sum(Order.total_amount).label("total_revenue")
    ).filter(
        and_(
            Order.seller_id == seller_id,
            Order.is_deleted.is_(False),
            Order.created_at >= start_date
        )
    )
    
    orders_result = orders_query.first()
    
    # Get orders by status
    status_counts = db.query(
        Order.status,
        func.count(Order.id)
    ).filter(
        and_(
            Order.seller_id == seller_id,
            Order.is_deleted.is_(False),
            Order.created_at >= start_date
        )
    ).group_by(Order.status).all()
    
    # Get orders by source
    source_counts = db.query(
        Order.order_source,
        func.count(Order.id)
    ).filter(
        and_(
            Order.seller_id == seller_id,
            Order.is_deleted.is_(False),
            Order.created_at >= start_date
        )
    ).group_by(Order.order_source).all()
    
    # Get top products
    top_products_query = db.query(
        Product.id,
        Product.name,
        func.count(Order.id).label("order_count"),
        func.sum(Order.total_amount).label("total_revenue")
    ).join(
        Order, Order.product_id == Product.id
    ).filter(
        and_(
            Order.seller_id == seller_id,
            Order.is_deleted.is_(False),
            Order.created_at >= start_date
        )
    ).group_by(
        Product.id, Product.name
    ).order_by(
        desc("order_count")
    ).limit(5)
    
    top_products = top_products_query.all()
    
    # Format the response
    stats = {
        "total_orders": orders_result.total_orders or 0,
        "total_revenue": float(orders_result.total_revenue or 0),
        "orders_by_status": {status.value: count for status, count in status_counts},
        "orders_by_source": {source.value: count for source, count in source_counts},
        "top_products": [
            {
                "id": str(product.id),
                "name": product.name,
                "order_count": product.order_count,
                "revenue": float(product.total_revenue or 0)
            }
            for product in top_products
        ],
        "time_period_days": days
    }
    
    return stats

def mark_notification_sent(
    db: Session,
    order_id: UUID,
    seller_id: UUID
) -> bool:
    """
    Mark an order as having had notifications sent
    """
    order = get_order(db, order_id, seller_id)
    
    if not order:
        return False
    
    # Store current version for optimistic locking
    current_version = order.version
    
    # Execute update with version check to prevent concurrent modifications
    result = db.execute(
        update(Order)
        .where(
            and_(
                Order.id == order_id,
                Order.seller_id == seller_id,
                Order.version == current_version
            )
        )
        .values(
            notification_sent=True,
            updated_at=datetime.utcnow(),
            version=current_version + 1
        )
    )
    
    if result.rowcount == 0:
        db.rollback()
        return False
    
    db.commit()
    return True
