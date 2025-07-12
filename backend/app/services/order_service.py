import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple
from uuid import UUID

import sentry_sdk
from sqlalchemy import and_, desc, func, or_, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import AsyncRetrying, stop_after_attempt, wait_fixed

from backend.app.domain.events.event_bus import EventBus
from backend.app.domain.events.order_events import OrderEventFactory
from backend.app.core.error_counters import order_failures, payment_failures
from backend.app.models.cart import Cart, CartItem
from backend.app.models.conversation_history import ChannelType
from backend.app.models.order import Order, OrderSource, OrderStatus
from backend.app.models.order_channel_meta import OrderChannelMeta
from backend.app.models.order_item import OrderItem
from backend.app.models.product import Product

# WhatsAppOrderDetails has been replaced by OrderChannelMeta
from backend.app.schemas.order import OrderCreate, OrderStatusUpdate, ModernOrderCreate
from backend.app.services.audit_service import AuditActionType, create_audit_log
from backend.app.services.order_creation_service import OrderCreationService
from backend.app.services.order_query_service import OrderQueryService
from backend.app.services.order_status_service import OrderStatusService
from backend.app.services.order_transaction_service import OrderTransactionService
from backend.app.services.order_exceptions import OrderError, OrderNotFoundError, OrderValidationError
from backend.app.core.exceptions import AppError

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
class OrderError(AppError):
    """Base exception for order-related errors"""

    pass


class OrderNotFoundError(OrderError):
    """Raised when an order is not found"""

    pass


class OrderValidationError(OrderError):
    """Raised when order validation fails"""
    # Extend with context attributes as needed

    pass


@asynccontextmanager
async def transactional(db: AsyncSession) -> AsyncGenerator[None, Any]:
    """
    Async context manager for database transactions.

    Args:
        db: AsyncSession instance

    Yields:
        None

    Raises:
        Exception: Any exception that occurs during the transaction
    """
    try:
        yield
        await db.commit()
    except AppError:  # Explicitly catch AppError to ensure rollback on all errors
        await db.rollback()
        raise
    except Exception:  # Add a separate 'except Exception:' only for logging and re-raising as a last resort
        await db.rollback()
        raise


class OrderService:
    """
    Orchestrator for all order-related business logic. Delegates to focused service classes.
    """

    def __init__(self, db):
        self.db = db
        self.creation_service = OrderCreationService(db)
        self.query_service = OrderQueryService(db)
        self.status_service = OrderStatusService(db)
        self.transaction_service = OrderTransactionService(db)

    # Order creation
    async def create_order(self, order_in, seller_id):
        return await self.creation_service.create_order(order_in, seller_id)

    async def create_whatsapp_order(self, order_in, seller_id):
        return await self.creation_service.create_whatsapp_order(order_in, seller_id)

    async def assign_channel_metadata(self, order, channel_data):
        return await self.creation_service.assign_channel_metadata(order, channel_data)

    async def validate_order(self, product_id, seller_id, quantity, items):
        return await self.creation_service.validate_order(product_id, seller_id, quantity, items)

    def calculate_totals(self, items, shipping_cost=500, tax_rate=0.16):
        return self.creation_service.calculate_totals(items, shipping_cost, tax_rate)

    # Order queries
    async def get_order(self, order_id, seller_id=None):
        return await self.query_service.get_order(order_id, seller_id)

    async def get_orders(self, seller_id=None, status=None, order_source=None, search=None, start_date=None, end_date=None, limit=100, offset=0):
        return await self.query_service.get_orders(seller_id, status, order_source, search, start_date, end_date, limit, offset)

    async def get_orders_for_buyer(self, customer_id, tenant_id, limit=100, offset=0):
        """Retrieve orders for a specific buyer and tenant."""
        return await self.query_service.get_orders_for_buyer(
            customer_id=customer_id,
            tenant_id=tenant_id,
            limit=limit,
            offset=offset,
        )

    async def get_order_by_number(self, order_number, seller_id=None):
        return await self.query_service.get_order_by_number(order_number, seller_id)

    def get_seller_dashboard_stats(self, seller_id, days=30):
        return self.query_service.get_seller_dashboard_stats(seller_id, days)

    def mark_notification_sent(self, order_id, seller_id):
        return self.query_service.mark_notification_sent(order_id, seller_id)

    def create_order_from_chat(self, chat_data, tenant_id, phone_number):
        return self.query_service.create_order_from_chat(chat_data, tenant_id, phone_number)

    # Order status
    async def update_order_status(self, order_id, status_update, seller_id):
        return await self.status_service.update_order_status(order_id, status_update, seller_id)

    async def update_order_status_internal(self, order_id, seller_id, status, tracking_number=None, shipping_carrier=None):
        return await self.status_service.update_order_status_internal(order_id, seller_id, status, tracking_number, shipping_carrier)

    def is_valid_transition(self, current_status, new_status):
        return self.status_service.is_valid_transition(current_status, new_status)

    async def delete_order(self, order_id, seller_id):
        return await self.status_service.delete_order(order_id, seller_id)

    # Transactions
    async def process_transaction(self, order, payment_data):
        return await self.transaction_service.process_transaction(order, payment_data)


# Export only the class and exceptions
__all__ = ["OrderService", "OrderError",
           "OrderNotFoundError", "OrderValidationError"]
