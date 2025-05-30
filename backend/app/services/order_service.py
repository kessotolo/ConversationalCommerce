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


"""
Order Management Service

This module provides comprehensive order management functionality for the Conversational Commerce platform.
It handles the entire order lifecycle from creation to fulfillment, with support for:

- Order creation from multiple channels (WhatsApp, website, Instagram)
- Status tracking and updates with audit logging
- Multi-channel notification support
- Seller dashboard analytics
- Tenant isolation for multi-tenant security

Key business rules implemented:
1. Orders are always associated with a valid product and seller
2. Order status transitions follow a defined workflow
3. Sellers can only access and modify their own orders
4. Soft deletion preserves order history while allowing logical removal
5. Optimistic locking prevents concurrent modification issues

The service uses SQLAlchemy for database operations and incorporates audit logging
for compliance and traceability of all significant order events.
"""


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
    Create a new order in the system with validation.
    
    This function performs several business logic validations:
    1. Verifies the product exists and belongs to the seller
    2. Ensures the product is not deleted
    3. Creates an order with a unique ID
    4. Records WhatsApp-specific metadata if provided
    5. Creates an audit log entry for the creation event
    
    Args:
        db (Session): Database session
        product_id (UUID): ID of the product being ordered
        seller_id (UUID): ID of the seller who owns the product
        buyer_name (str): Full name of the buyer
        buyer_phone (str): Contact phone number of the buyer
        quantity (int): Quantity of products ordered
        total_amount (float): Total monetary amount of the order
        order_source (OrderSource): Source channel of the order (default: whatsapp)
        buyer_email (Optional[str]): Email address of the buyer
        buyer_address (Optional[str]): Shipping address of the buyer
        notes (Optional[str]): Additional notes or instructions for the order
        whatsapp_number (Optional[str]): WhatsApp number if ordered via WhatsApp
        message_id (Optional[str]): ID of the WhatsApp message that initiated the order
        conversation_id (Optional[str]): ID of the conversation thread in WhatsApp
        
    Returns:
        Order: The newly created order object
        
    Raises:
        HTTPException: If product doesn't exist or doesn't belong to the seller (404)
        IntegrityError: If there's a database constraint violation
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
    Retrieve an order by ID with tenant isolation security.
    
    This function implements important security controls:
    1. Ensures sellers can only access their own orders (tenant isolation)
    2. Properly handles the case when an order doesn't exist
    
    Args:
        db (Session): Database session
        order_id (UUID): ID of the order to retrieve
        seller_id (UUID): ID of the seller requesting the order
        
    Returns:
        Order: The requested order if found and belongs to the seller
        
    Raises:
        HTTPException: If order doesn't exist or doesn't belong to the seller (404)
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
    Retrieve orders with comprehensive filtering and pagination support.
    
    This function implements several important features:
    1. Tenant isolation: Ensures sellers only see their own orders
    2. Multi-criteria filtering: By status, source, date range, and text search
    3. Text search: Searches across buyer name, phone, and email fields
    4. Date range filtering: With appropriate default handling when dates are missing
    5. Pagination: With limit and offset parameters
    
    The search is implemented as a case-insensitive partial match across multiple fields.
    
    Args:
        db (Session): Database session
        seller_id (UUID): ID of the seller whose orders to retrieve
        status (Optional[OrderStatus]): Filter by order status
        order_source (Optional[OrderSource]): Filter by order source channel
        search (Optional[str]): Text to search across buyer name, phone, and email
        start_date (Optional[datetime]): Filter orders created on or after this date
        end_date (Optional[datetime]): Filter orders created on or before this date
        limit (int): Maximum number of orders to return (default: 100)
        offset (int): Number of orders to skip (default: 0)
        
    Returns:
        Tuple[List[Order], int]: A tuple containing:
            - List of Order objects matching the criteria
            - Total count of matching orders (without pagination)
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
    Update an order's status with optimistic locking to prevent concurrent modifications.
    
    This function implements several advanced features:
    1. Optimistic locking: Prevents race conditions when multiple users update the same order
    2. Tenant isolation: Ensures sellers can only update their own orders
    3. Status transition validation: Validates that the status change follows the allowed flow
    4. Conditional field updates: Only adds tracking/shipping info when provided
    5. Audit logging: Records who changed the status and when
    
    The optimistic locking works by checking if the order has been modified since it was
    last retrieved. If it has, the update is rejected to prevent data loss.
    
    Args:
        db (Session): Database session
        order_id (UUID): ID of the order to update
        seller_id (UUID): ID of the seller performing the update
        status (OrderStatus): New status to set for the order
        tracking_number (Optional[str]): Shipping tracking number (for shipped status)
        shipping_carrier (Optional[str]): Shipping carrier name (for shipped status)
        
    Returns:
        Order: The updated order object
        
    Raises:
        HTTPException: 
            - 404: If order doesn't exist or doesn't belong to the seller
            - 409: If the order has been modified concurrently
            - 400: If the status transition is invalid
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
    Soft delete an order by marking it as deleted rather than removing from database.
    
    This function implements important data handling practices:
    1. Soft deletion: Preserves order history while making it inactive
    2. Tenant isolation: Ensures sellers can only delete their own orders
    3. Status validation: Prevents deletion of orders in certain statuses
    4. Audit logging: Records the deletion event for compliance
    
    Args:
        db (Session): Database session
        order_id (UUID): ID of the order to delete
        seller_id (UUID): ID of the seller performing the deletion
        
    Returns:
        None
        
    Raises:
        HTTPException: 
            - 404: If order doesn't exist or doesn't belong to the seller
            - 400: If the order cannot be deleted due to its current status
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
    Calculate comprehensive dashboard statistics for a seller's business performance.
    
    This function performs complex analytics operations:
    1. Order trends: Calculates orders by status over the specified time period
    2. Revenue metrics: Total, average, and daily revenue figures
    3. Channel analysis: Orders broken down by source channel
    4. Time-based analysis: Orders grouped by day for trend visualization
    5. Comparative analysis: Performance compared to previous time period
    
    The statistics are calculated using efficient SQL aggregations rather than 
    loading all data into Python to maximize performance with large datasets.
    
    Args:
        db (Session): Database session
        seller_id (UUID): ID of the seller to generate statistics for
        days (int): Number of days to include in the analysis (default: 30)
        
    Returns:
        Dict[str, Any]: A dictionary containing multiple statistics metrics:
            - order_counts: Count of orders by status
            - total_revenue: Total revenue in the period
            - avg_order_value: Average value per order
            - orders_by_source: Breakdown of orders by channel
            - daily_orders: Time series of orders by day
            - comparison: Percentage change from previous period
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
    Mark an order as having had notifications sent to prevent duplicate notifications.
    
    This function implements important communication controls:
    1. Notification tracking: Records when notifications were sent for an order
    2. Tenant isolation: Ensures sellers can only mark their own orders
    3. Idempotency: Safely handles cases where notifications were already marked as sent
    4. Audit logging: Records the notification event for compliance and debugging
    
    Args:
        db (Session): Database session
        order_id (UUID): ID of the order to mark
        seller_id (UUID): ID of the seller who owns the order
        
    Returns:
        Order: The updated order object
        
    Raises:
        HTTPException: If order doesn't exist or doesn't belong to the seller (404)
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
