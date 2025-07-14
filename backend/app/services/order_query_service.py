import logging
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc, text
from sqlalchemy.orm import joinedload, selectinload
from app.models.order import Order, OrderStatus, OrderSource
from app.models.order_item import OrderItem
from app.models.order_channel_meta import OrderChannelMeta
from app.models.product import Product
from app.models.customer import Customer
from app.services.order_exceptions import OrderNotFoundError, OrderValidationError
from app.core.exceptions import AppError

logger = logging.getLogger(__name__)


class OrderQueryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_order(self, order_id: UUID, seller_id: UUID = None) -> Optional[Order]:
        """
        Get a single order by ID with tenant isolation.

        Args:
            order_id: The order ID to retrieve
            seller_id: The seller/tenant ID for isolation (optional for admin queries)

        Returns:
            Order instance or None if not found

        Raises:
            OrderNotFoundError: If order doesn't exist or access denied
        """
        try:
            # Build query with eager loading for related data
            query = select(Order).options(
                joinedload(Order.items),
                joinedload(Order.channel_metadata),
                joinedload(Order.payments),
                joinedload(Order.returns)
            ).where(
                and_(
                    Order.id == order_id,
                    Order.is_deleted == False
                )
            )

            # Add tenant isolation
            if seller_id:
                query = query.where(Order.seller_id == seller_id)

            result = await self.db.execute(query)
            order = result.scalar_one_or_none()

            if not order:
                raise OrderNotFoundError(
                    f"Order {order_id} not found or access denied")

            logger.info(f"Retrieved order {order_id} for seller {seller_id}")
            return order

        except Exception as e:
            logger.error(f"Error retrieving order {order_id}: {str(e)}")
            if isinstance(e, OrderNotFoundError):
                raise
            raise AppError(f"Failed to retrieve order: {str(e)}")

    async def get_orders(
        self,
        seller_id: UUID = None,
        status: Optional[OrderStatus] = None,
        order_source: Optional[OrderSource] = None,
        search: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[Order], int]:
        """
        Get orders with filtering and pagination, enforcing tenant isolation.

        Args:
            seller_id: Seller/tenant ID for isolation
            status: Filter by order status
            order_source: Filter by order source
            search: Search term for buyer name/phone/email
            start_date: Start date for created_at filter
            end_date: End date for created_at filter
            limit: Maximum number of results
            offset: Pagination offset

        Returns:
            Tuple of (orders list, total count)
        """
        try:
            # Base query with tenant isolation
            base_conditions = [Order.is_deleted == False]

            if seller_id:
                base_conditions.append(Order.seller_id == seller_id)

            # Add filters
            if status:
                base_conditions.append(Order.status == status)

            if order_source:
                base_conditions.append(Order.order_source == order_source)

            if search:
                search_term = f"%{search}%"
                base_conditions.append(
                    or_(
                        Order.buyer_name.ilike(search_term),
                        Order.buyer_phone.ilike(search_term),
                        Order.buyer_email.ilike(search_term),
                        Order.notes.ilike(search_term)
                    )
                )

            if start_date:
                base_conditions.append(Order.created_at >= start_date)

            if end_date:
                base_conditions.append(Order.created_at <= end_date)

            # Count query
            count_query = select(func.count(Order.id)).where(
                and_(*base_conditions))
            count_result = await self.db.execute(count_query)
            total_count = count_result.scalar()

            # Data query with eager loading
            data_query = select(Order).options(
                joinedload(Order.items),
                joinedload(Order.channel_metadata),
                selectinload(Order.payments),
                selectinload(Order.returns)
            ).where(and_(*base_conditions)).order_by(desc(Order.created_at)).limit(limit).offset(offset)

            result = await self.db.execute(data_query)
            orders = result.scalars().all()

            logger.info(
                f"Retrieved {len(orders)} orders (total: {total_count}) for seller {seller_id}")
            return list(orders), total_count

        except Exception as e:
            logger.error(f"Error retrieving orders: {str(e)}")
            raise AppError(f"Failed to retrieve orders: {str(e)}")

    async def get_order_by_number(self, order_number: str, seller_id: UUID = None) -> Optional[Order]:
        """
        Get order by order number with tenant isolation.

        Args:
            order_number: The order number to search for
            seller_id: Seller/tenant ID for isolation

        Returns:
            Order instance or None if not found
        """
        try:
            query = select(Order).options(
                joinedload(Order.items),
                joinedload(Order.channel_metadata),
                joinedload(Order.payments)
            ).where(
                and_(
                    Order.id == order_number,  # Assuming order number is stored as ID
                    Order.is_deleted == False
                )
            )

            # Add tenant isolation
            if seller_id:
                query = query.where(Order.seller_id == seller_id)

            result = await self.db.execute(query)
            order = result.scalar_one_or_none()

            if order:
                logger.info(
                    f"Retrieved order by number {order_number} for seller {seller_id}")

            return order

        except Exception as e:
            logger.error(
                f"Error retrieving order by number {order_number}: {str(e)}")
            raise AppError(f"Failed to retrieve order by number: {str(e)}")

    async def get_orders_for_buyer(
        self,
        customer_id: UUID,
        tenant_id: UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[Order], int]:
        """
        Get orders for a specific buyer with tenant isolation.

        Args:
            customer_id: Customer ID
            tenant_id: Tenant ID for isolation
            limit: Maximum number of results
            offset: Pagination offset

        Returns:
            Tuple of (orders list, total count)
        """
        try:
            base_conditions = [
                Order.customer_id == customer_id,
                Order.tenant_id == tenant_id,
                Order.is_deleted == False
            ]

            # Count query
            count_query = select(func.count(Order.id)).where(
                and_(*base_conditions))
            count_result = await self.db.execute(count_query)
            total_count = count_result.scalar()

            # Data query
            data_query = select(Order).options(
                joinedload(Order.items),
                joinedload(Order.channel_metadata),
                selectinload(Order.payments)
            ).where(and_(*base_conditions)).order_by(desc(Order.created_at)).limit(limit).offset(offset)

            result = await self.db.execute(data_query)
            orders = result.scalars().all()

            logger.info(
                f"Retrieved {len(orders)} orders for buyer {customer_id} in tenant {tenant_id}")
            return list(orders), total_count

        except Exception as e:
            logger.error(
                f"Error retrieving orders for buyer {customer_id}: {str(e)}")
            raise AppError(f"Failed to retrieve orders for buyer: {str(e)}")

    async def get_seller_dashboard_stats(self, seller_id: UUID, days: int = 30) -> Dict[str, Any]:
        """
        Get dashboard statistics for a seller.

        Args:
            seller_id: Seller ID
            days: Number of days to look back for statistics

        Returns:
            Dictionary containing dashboard statistics
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)

            # Base conditions
            base_conditions = [
                Order.seller_id == seller_id,
                Order.is_deleted == False,
                Order.created_at >= cutoff_date
            ]

            # Total orders
            total_orders_query = select(func.count(
                Order.id)).where(and_(*base_conditions))
            total_orders_result = await self.db.execute(total_orders_query)
            total_orders = total_orders_result.scalar()

            # Total revenue
            total_revenue_query = select(
                func.sum(Order.total_amount)).where(and_(*base_conditions))
            total_revenue_result = await self.db.execute(total_revenue_query)
            total_revenue = total_revenue_result.scalar() or 0

            # Orders by status
            status_query = select(
                Order.status,
                func.count(Order.id).label('count')
            ).where(and_(*base_conditions)).group_by(Order.status)

            status_result = await self.db.execute(status_query)
            orders_by_status = {row.status: row.count for row in status_result}

            # Orders by source
            source_query = select(
                Order.order_source,
                func.count(Order.id).label('count')
            ).where(and_(*base_conditions)).group_by(Order.order_source)

            source_result = await self.db.execute(source_query)
            orders_by_source = {
                row.order_source: row.count for row in source_result}

            # Recent orders (last 7 days)
            recent_cutoff = datetime.utcnow() - timedelta(days=7)
            recent_orders_query = select(func.count(Order.id)).where(
                and_(
                    Order.seller_id == seller_id,
                    Order.is_deleted == False,
                    Order.created_at >= recent_cutoff
                )
            )
            recent_orders_result = await self.db.execute(recent_orders_query)
            recent_orders = recent_orders_result.scalar()

            # Average order value
            avg_order_value = total_revenue / total_orders if total_orders > 0 else 0

            stats = {
                'total_orders': total_orders,
                'total_revenue': total_revenue,
                'average_order_value': avg_order_value,
                'recent_orders': recent_orders,
                'orders_by_status': orders_by_status,
                'orders_by_source': orders_by_source,
                'period_days': days
            }

            logger.info(f"Generated dashboard stats for seller {seller_id}")
            return stats

        except Exception as e:
            logger.error(
                f"Error generating dashboard stats for seller {seller_id}: {str(e)}")
            raise AppError(f"Failed to generate dashboard stats: {str(e)}")

    async def mark_notification_sent(self, order_id: UUID, seller_id: UUID) -> bool:
        """
        Mark that a notification has been sent for an order.

        Args:
            order_id: Order ID
            seller_id: Seller ID for tenant isolation

        Returns:
            True if successfully marked, False otherwise
        """
        try:
            # Update the order's notification status
            query = text("""
                UPDATE orders
                SET notification_sent = true,
                    last_notification_at = CURRENT_TIMESTAMP
                WHERE id = :order_id
                AND seller_id = :seller_id
                AND is_deleted = false
            """)

            result = await self.db.execute(
                query,
                {
                    'order_id': str(order_id),
                    'seller_id': str(seller_id)
                }
            )

            await self.db.commit()

            success = result.rowcount > 0
            if success:
                logger.info(f"Marked notification sent for order {order_id}")
            else:
                logger.warning(
                    f"Failed to mark notification sent for order {order_id}")

            return success

        except Exception as e:
            logger.error(
                f"Error marking notification sent for order {order_id}: {str(e)}")
            await self.db.rollback()
            raise AppError(f"Failed to mark notification sent: {str(e)}")

    async def create_order_from_chat(self, chat_data: dict, tenant_id: str, phone_number: str) -> Dict[str, Any]:
        """
        Create an order from chat conversation data.

        Args:
            chat_data: Conversation data containing order details
            tenant_id: Tenant ID
            phone_number: Customer phone number

        Returns:
            Dictionary containing order creation result
        """
        try:
            # Extract order details from chat data
            product_name = chat_data.get('product_name')
            quantity = chat_data.get('quantity', 1)
            customer_name = chat_data.get('customer_name')

            if not all([product_name, customer_name]):
                raise OrderValidationError(
                    "Missing required order details from chat")

            # Find product by name
            product_query = select(Product).where(
                and_(
                    Product.name.ilike(f"%{product_name}%"),
                    Product.tenant_id == UUID(tenant_id)
                )
            )
            product_result = await self.db.execute(product_query)
            product = product_result.scalar_one_or_none()

            if not product:
                raise OrderValidationError(
                    f"Product '{product_name}' not found")

            # Calculate total
            total_amount = product.price * quantity

            # Create order data
            order_data = {
                'product_id': product.id,
                'seller_id': UUID(tenant_id),
                'tenant_id': UUID(tenant_id),
                'buyer_name': customer_name,
                'buyer_phone': phone_number,
                'quantity': quantity,
                'total_amount': total_amount,
                'order_source': OrderSource.whatsapp,
                'status': OrderStatus.pending,
                'created_at': datetime.utcnow()
            }

            # Create order
            order = Order(**order_data)
            self.db.add(order)
            await self.db.flush()

            # Create WhatsApp channel metadata
            channel_meta = OrderChannelMeta(
                order_id=order.id,
                channel='whatsapp',
                message_id=chat_data.get('message_id'),
                chat_session_id=chat_data.get('conversation_id'),
                user_response_log=phone_number
            )
            self.db.add(channel_meta)

            await self.db.commit()

            logger.info(
                f"Created order {order.id} from chat for {phone_number}")

            return {
                'order_id': str(order.id),
                'total_amount': total_amount,
                'product_name': product.name,
                'quantity': quantity,
                'status': 'created'
            }

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating order from chat: {str(e)}")
            if isinstance(e, (OrderValidationError, OrderNotFoundError)):
                raise
            raise AppError(f"Failed to create order from chat: {str(e)}")

    async def get_orders_by_phone(self, phone_number: str, tenant_id: UUID) -> List[Order]:
        """
        Get orders by phone number with tenant isolation.

        Args:
            phone_number: Customer phone number
            tenant_id: Tenant ID for isolation

        Returns:
            List of orders for the phone number
        """
        try:
            query = select(Order).options(
                joinedload(Order.items),
                joinedload(Order.channel_metadata)
            ).where(
                and_(
                    Order.buyer_phone == phone_number,
                    Order.tenant_id == tenant_id,
                    Order.is_deleted == False
                )
            ).order_by(desc(Order.created_at))

            result = await self.db.execute(query)
            orders = result.scalars().all()

            logger.info(
                f"Retrieved {len(orders)} orders for phone {phone_number} in tenant {tenant_id}")
            return list(orders)

        except Exception as e:
            logger.error(
                f"Error retrieving orders by phone {phone_number}: {str(e)}")
            raise AppError(f"Failed to retrieve orders by phone: {str(e)}")

    async def get_order_analytics(self, seller_id: UUID, period_days: int = 30) -> Dict[str, Any]:
        """
        Get detailed analytics for orders.

        Args:
            seller_id: Seller ID
            period_days: Number of days to analyze

        Returns:
            Dictionary containing analytics data
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=period_days)

            # Daily order counts
            daily_orders_query = select(
                func.date(Order.created_at).label('date'),
                func.count(Order.id).label('count'),
                func.sum(Order.total_amount).label('revenue')
            ).where(
                and_(
                    Order.seller_id == seller_id,
                    Order.is_deleted == False,
                    Order.created_at >= cutoff_date
                )
            ).group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at))

            daily_result = await self.db.execute(daily_orders_query)
            daily_data = [
                {
                    'date': row.date.isoformat(),
                    'orders': row.count,
                    'revenue': float(row.revenue or 0)
                }
                for row in daily_result
            ]

            # Top products
            top_products_query = select(
                Product.name,
                func.sum(OrderItem.quantity).label('total_quantity'),
                func.sum(OrderItem.subtotal).label('total_revenue')
            ).select_from(
                Order.__table__.join(OrderItem.__table__).join(
                    Product.__table__)
            ).where(
                and_(
                    Order.seller_id == seller_id,
                    Order.is_deleted == False,
                    Order.created_at >= cutoff_date
                )
            ).group_by(Product.name).order_by(desc(func.sum(OrderItem.quantity))).limit(10)

            top_products_result = await self.db.execute(top_products_query)
            top_products = [
                {
                    'product_name': row.name,
                    'quantity_sold': row.total_quantity,
                    'revenue': float(row.total_revenue or 0)
                }
                for row in top_products_result
            ]

            return {
                'daily_data': daily_data,
                'top_products': top_products,
                'period_days': period_days
            }

        except Exception as e:
            logger.error(
                f"Error getting order analytics for seller {seller_id}: {str(e)}")
            raise AppError(f"Failed to get order analytics: {str(e)}")
