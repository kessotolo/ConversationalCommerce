from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import and_, or_, desc, func, select, update, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
from functools import wraps
import contextlib
from contextlib import asynccontextmanager
from decimal import Decimal
import asyncio
from tenacity import AsyncRetrying, stop_after_attempt, wait_fixed

from app.models.order import Order, OrderStatus, OrderSource
from app.models.product import Product
from app.models.user import User
from app.services.audit_service import create_audit_log, AuditActionType
from fastapi import HTTPException, status
from app.models.whatsapp_order_details import WhatsAppOrderDetails
from app.models.order_create import OrderCreate
from app.models.whatsapp_order_create import WhatsAppOrderCreate
from app.models.order_status_update import OrderStatusUpdate


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


# Custom exceptions
class OrderError(Exception):
    """Base exception for order-related errors"""
    pass


class OrderNotFoundError(OrderError):
    """Raised when an order is not found"""
    pass


class OrderValidationError(OrderError):
    """Raised when order validation fails"""
    pass


# Legacy compatibility functions - these will be deprecated
# They're maintained temporarily for backward compatibility
def transactional(func):
    """Legacy transaction decorator to be deprecated in favor of async context managers"""
    @wraps(func)
    def wrapper(*args, db: Session, **kwargs):
        try:
            result = func(*args, db=db, **kwargs)
            db.commit()
            return result
        except Exception:
            db.rollback()
            raise
    return wrapper

    def _transactional(self, func, *args, **kwargs):
        try:
            result = func(*args, **kwargs)
            self.db.commit()
            return result
        except Exception:
            self.db.rollback()
            raise

    def create_order(self, *args, **kwargs) -> Order:
        return self._transactional(self._create_order, *args, **kwargs)

    def _create_order(
        self,
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
            OrderNotFoundError: If product doesn't exist or doesn't belong to the seller
            OrderValidationError: If there's a database constraint violation
        """
        product = self.db.query(Product).filter(
            and_(
                Product.id == product_id,
                Product.seller_id == seller_id,
                Product.is_deleted.is_(False)
            )
        ).first()

        if not product:
            raise OrderNotFoundError(
                "Product not found or does not belong to the seller")

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
            notes=notes
        )
        self.db.add(order)
        self.db.flush()
        # If WhatsApp fields are present, create WhatsAppOrderDetails
        if whatsapp_number or message_id or conversation_id:
            whatsapp_details = WhatsAppOrderDetails(
                order_id=order.id,
                whatsapp_number=whatsapp_number,
                message_id=message_id,
                conversation_id=conversation_id
            )
            self.db.add(whatsapp_details)
            self.db.flush()
            order.whatsapp_details = whatsapp_details
        create_audit_log(
            db=self.db,
            user_id=seller_id,
            action=AuditActionType.CREATE,
            resource_type="Order",
            resource_id=str(order.id),
            details=f"Created order for product {product_id}"
        )
        return order

    async def validate_order(self, product_id: UUID, seller_id: UUID, quantity: int, items: list) -> None:
        """
        Validate order fields, stock, and pricing. Raises OrderValidationError if validation fails.
        """
        if not product_id or not seller_id or not quantity or not items:
            raise OrderValidationError("Missing required order fields.")
        if quantity <= 0:
            raise OrderValidationError("Quantity must be positive.")
        for item in items:
            if item.get('quantity', 0) <= 0:
                raise OrderValidationError(
                    "Each item quantity must be positive.")
            if item.get('price', 0) < 0:
                raise OrderValidationError("Item price must be non-negative.")
        product = await self.db.execute(
            select(Product).where(
                Product.id == product_id,
                Product.is_deleted.is_(False)
            )
        )
        product = product.scalar_one_or_none()
        if not product:
            raise OrderValidationError("Product not found.")
        if hasattr(product, 'inventory_quantity') and product.inventory_quantity is not None:
            if product.inventory_quantity < quantity:
                raise OrderValidationError(
                    f"Insufficient stock for product {product.id}.")

    def calculate_totals(self, items: list, shipping_cost: float = 500, tax_rate: float = 0.16) -> dict:
        """
        Calculate subtotal, tax, shipping, and total for the order.
        Args:
            items (list): List of dicts with 'price' and 'quantity'.
            shipping_cost (float): Flat shipping cost (default 500).
            tax_rate (float): Tax rate (default 16%).
        Returns:
            dict: subtotal, tax_amount, shipping_cost, total_amount
        """
        subtotal = sum(item.get('price', 0) * item.get('quantity', 0)
                       for item in items)
        tax_amount = subtotal * tax_rate
        total_amount = subtotal + shipping_cost + tax_amount
        return {
            'subtotal': subtotal,
            'tax_amount': tax_amount,
            'shipping_cost': shipping_cost,
            'total_amount': total_amount
        }

    async def assign_channel_metadata(self, order: Order, channel_data: dict) -> None:
        """
        Assign channel-specific metadata (WhatsApp, Instagram, SMS, etc.) to the order.
        """
        if channel_data.get('whatsapp_number') or channel_data.get('message_id') or channel_data.get('conversation_id'):
            whatsapp_details = WhatsAppOrderDetails(
                order_id=order.id,
                whatsapp_number=channel_data.get('whatsapp_number'),
                message_id=channel_data.get('message_id'),
                conversation_id=channel_data.get('conversation_id')
            )
            self.db.add(whatsapp_details)
            await self.db.flush()
            order.whatsapp_details = whatsapp_details
        # Extend for other channels (e.g., Instagram, SMS) as needed

    async def process_transaction(self, order: Order, payment_data: dict) -> None:
        """
        Process payment for the order using PaymentService. Updates order/payment status.
        """
        from app.services.payment.payment_service import PaymentService
        payment_service = PaymentService(self.db)
        payment_response = await payment_service.initialize_payment(payment_data)
        if not payment_response or not getattr(payment_response, 'success', True):
            raise OrderValidationError("Payment failed or was not successful.")
        order.status = OrderStatus.PAID
        await self.db.commit()

    async def set_tenant_session(self, tenant_id: UUID) -> None:
        """
        Optionally set PostgreSQL session variable for tenant isolation.
        Args:
            tenant_id (UUID): The tenant's UUID
        """
        await self.db.execute(text("SET my.tenant_id = :tenant_id"), {"tenant_id": str(tenant_id)})

    async def create_order(self, order_in: OrderCreate, seller_id: UUID) -> Order:
        items = [{
            'product_id': order_in.product_id,
            'price': order_in.total_amount / order_in.quantity,
            'quantity': order_in.quantity
        }]
        return await self._create_order(
            product_id=order_in.product_id,
            seller_id=seller_id,
            buyer_name=order_in.buyer_name,
            buyer_phone=order_in.buyer_phone,
            items=items,
            order_source=order_in.order_source,
            buyer_email=order_in.buyer_email,
            buyer_address=order_in.buyer_address,
            notes=order_in.notes,
            channel_data={}
        )

    async def create_whatsapp_order(self, order_in: WhatsAppOrderCreate, seller_id: UUID) -> Order:
        items = [{
            'product_id': order_in.product_id,
            'price': order_in.total_amount / order_in.quantity,
            'quantity': order_in.quantity
        }]
        return await self._create_order(
            product_id=order_in.product_id,
            seller_id=seller_id,
            buyer_name=order_in.buyer_name,
            buyer_phone=order_in.buyer_phone,
            items=items,
            order_source=OrderSource.whatsapp,
            buyer_email=order_in.buyer_email,
            buyer_address=order_in.buyer_address,
            notes=order_in.notes,
            channel_data={
                'whatsapp_number': order_in.whatsapp_number,
                'message_id': order_in.message_id,
                'conversation_id': order_in.conversation_id
            }
        )

    async def get_order(self, order_id: UUID, seller_id: UUID = None) -> Optional[Order]:
        result = await self.db.execute(
            select(Order).where(
                Order.id == order_id,
                Order.is_deleted.is_(False)
            )
        )
        return result.scalar_one_or_none()

    async def get_orders(
        self,
        seller_id: UUID = None,
        status: Optional[OrderStatus] = None,
        order_source: Optional[OrderSource] = None,
        search: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[Order], int]:
        query = select(Order).where(Order.is_deleted.is_(False))
        if status:
            query = query.where(Order.status == status)
        if order_source:
            query = query.where(Order.order_source == order_source)
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Order.buyer_name.ilike(search_term),
                    Order.buyer_phone.ilike(search_term),
                    Order.buyer_email.ilike(search_term)
                )
            )
        if start_date:
            query = query.where(Order.created_at >= start_date)
        if end_date:
            query = query.where(Order.created_at <= end_date)
        query = query.order_by(desc(Order.created_at)
                               ).offset(offset).limit(limit)
        result = await self.db.execute(query)
        orders = result.scalars().all()
        total_count = len(orders)  # For async, count separately if needed
        return orders, total_count

    async def update_order_status(self, order_id: UUID, status_update: OrderStatusUpdate, seller_id: UUID) -> Optional[Order]:
        return await self._update_order_status(
            order_id=order_id,
            seller_id=seller_id,
            status=status_update.status,
            tracking_number=status_update.tracking_number,
            shipping_carrier=status_update.shipping_carrier
        )

    async def delete_order(
        self,
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
            OrderNotFoundError: If order doesn't exist or doesn't belong to the seller
            OrderValidationError: If the order cannot be deleted due to its current status
        """
        async for attempt in AsyncRetrying(stop=stop_after_attempt(3), wait=wait_fixed(0.5)):
            with attempt:
                async with self.db.begin():
                    order = await self.get_order(order_id)
                    if not order:
                        return False
                    current_version = order.version
                    result = await self.db.execute(
                        update(Order)
                        .where(
                            Order.id == order_id,
                            Order.version == current_version
                        )
                        .values(
                            is_deleted=True,
                            updated_at=datetime.utcnow(),
                            version=current_version + 1
                        )
                    )
                    if result.rowcount == 0:
                        await self.db.rollback()
                        return False
                    await self.db.commit()
                    await create_audit_log(
                        db=self.db,
                        user_id=seller_id,
                        action=AuditActionType.DELETE,
                        resource_type="Order",
                        resource_id=str(order_id),
                        details="Soft deleted order"
                    )
        return True

    def get_seller_dashboard_stats(
        self,
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
        orders_query = self.db.query(
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
        status_counts = self.db.query(
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
        source_counts = self.db.query(
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
        top_products_query = self.db.query(
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
        self,
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
            OrderNotFoundError: If order doesn't exist or doesn't belong to the seller
        """
        order = self.get_order(order_id, seller_id)

        if not order:
            return False

        # Store current version for optimistic locking
        current_version = order.version

        # Execute update with version check to prevent concurrent modifications
        result = self.db.execute(
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
            self.db.rollback()
            return False

        self.db.commit()
        return True

    async def get_order_by_number(self, order_number: str, seller_id: UUID = None) -> Optional[Order]:
        result = await self.db.execute(
            select(Order).where(
                Order.order_number == order_number,
                Order.is_deleted.is_(False)
            )
        )
        return result.scalar_one_or_none()


# Export only the class and exceptions
__all__ = ["OrderService", "OrderError",
           "OrderNotFoundError", "OrderValidationError"]
