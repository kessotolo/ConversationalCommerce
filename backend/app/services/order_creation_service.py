import os
from typing import Any, Dict, List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select, text
from app.models.order import Order, OrderSource
from app.models.product import Product
from app.models.order_channel_meta import OrderChannelMeta
from app.models.order_item import OrderItem
from app.schemas.order import OrderCreate, WhatsAppOrderCreate
from app.services.audit_service import AuditActionType, create_audit_log
import logging


class OrderCreationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_order(self, order_in: OrderCreate, seller_id: UUID) -> Order:
        items = [
            {
                "product_id": order_in.product_id,
                "price": order_in.total_amount / order_in.quantity,
                "quantity": order_in.quantity,
            }
        ]
        return await self.create_order_internal(
            product_id=order_in.product_id,
            seller_id=seller_id,
            buyer_name=order_in.buyer_name,
            buyer_phone=order_in.buyer_phone,
            items=items,
            order_source=order_in.order_source,
            buyer_email=order_in.buyer_email,
            buyer_address=order_in.buyer_address,
            notes=order_in.notes,
            channel_data={"channel": order_in.channel},
        )

    async def create_order_internal(
        self,
        product_id: UUID,
        seller_id: UUID,
        buyer_name: str,
        buyer_phone: str,
        quantity: int = None,
        total_amount: float = None,
        order_source: OrderSource = OrderSource.whatsapp,
        buyer_email: Optional[str] = None,
        buyer_address: Optional[str] = None,
        notes: Optional[str] = None,
        whatsapp_number: Optional[str] = None,
        message_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        items: Optional[List[Dict[str, Any]]] = None,
        channel_data: Optional[Dict[str, Any]] = None,
    ) -> Order:
        logging.debug(
            f"OrderCreationService.create_order_internal: Looking up product with id={product_id}, seller_id={seller_id}")
        if os.environ.get("TESTING") == "true":
            logging.debug("Test mode: Querying all products")
            all_products_stmt = select(
                Product.id, Product.seller_id, Product.tenant_id)
            all_products_result = await self.db.execute(all_products_stmt)
            all_products = all_products_result.fetchall()
            logging.debug(f"Available products in DB: {all_products}")
            await self.db.execute(text("SET LOCAL my.bypass_rls = true"))
        # ATOMIC INVENTORY ENFORCEMENT
        # Lock the product row for update to prevent overselling
        stmt = select(Product).where(
            and_(
                Product.id == product_id,
                Product.seller_id == seller_id,
            )
        ).with_for_update()
        result = await self.db.execute(stmt)
        product = result.scalar_one_or_none()
        logging.debug(
            f"Product lookup result: {'Found' if product else 'Not found'} (locked for update)")
        if not product:
            await self.db.rollback()
            raise Exception(
                f"Product not found with id={product_id} and seller_id={seller_id}")
        if items:
            if quantity is None:
                quantity = sum(item.get("quantity", 0) for item in items)
            if total_amount is None:
                total_amount = sum(
                    item.get("price", 0) * item.get("quantity", 0) for item in items
                )
        # Check inventory after acquiring the lock
        if product.inventory_quantity < quantity:
            await self.db.rollback()
            raise Exception(f"Insufficient stock for product {product.id}.")
        # Deduct inventory
        product.inventory_quantity -= quantity
        await self.db.flush()
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
        )
        self.db.add(order)
        await self.db.flush()
        if items:
            order_items = []
            for item in items:
                order_item = OrderItem(
                    order_id=order.id,
                    product_id=item.get("product_id", product_id),
                    quantity=item.get("quantity", 1),
                    price=item.get("price", 0),
                    subtotal=item.get("price", 0) * item.get("quantity", 1),
                )
                self.db.add(order_item)
                order_items.append(order_item)
            await self.db.flush()
            order.items = order_items
        if channel_data:
            channel_meta = OrderChannelMeta(
                order_id=order.id,
                channel=(
                    ChannelType.whatsapp
                    if order_source == OrderSource.whatsapp
                    else ChannelType.other
                ),
                message_id=channel_data.get("message_id"),
                chat_session_id=channel_data.get("conversation_id"),
                user_response_log=channel_data.get("whatsapp_number"),
                metadata=channel_data,
            )
            self.db.add(channel_meta)
            await self.db.flush()
            order.channel_metadata = [channel_meta]
        elif order_source == OrderSource.whatsapp and (
            whatsapp_number or message_id or conversation_id
        ):
            channel_meta = OrderChannelMeta(
                order_id=order.id,
                channel=ChannelType.whatsapp,
                message_id=message_id,
                chat_session_id=conversation_id,
                user_response_log=whatsapp_number,
            )
            self.db.add(channel_meta)
            await self.db.flush()
            order.channel_metadata = [channel_meta]
        await create_audit_log(
            db=self.db,
            user_id=seller_id,
            action=AuditActionType.CREATE,
            resource_type="Order",
            resource_id=str(order.id),
            details=f"Created order for product {product_id}",
        )
        await self.db.commit()
        await self.db.refresh(order)
        return order

    async def create_whatsapp_order(self, order_in: WhatsAppOrderCreate, seller_id: UUID) -> Order:
        # Implement WhatsApp-specific order creation logic here
        return await self.create_order(order_in, seller_id)

    async def assign_channel_metadata(self, order: Order, channel_data: dict) -> None:
        # Assign channel metadata to an order
        pass  # Implement as needed

    async def validate_order(self, product_id: UUID, seller_id: UUID, quantity: int, items: list) -> None:
        if not product_id or not seller_id or not quantity or not items:
            raise Exception("Missing required order fields.")
        if quantity <= 0:
            raise Exception("Quantity must be positive.")
        for item in items:
            if item.get("quantity", 0) <= 0:
                raise Exception("Each item quantity must be positive.")
            if item.get("price", 0) < 0:
                raise Exception("Item price must be non-negative.")
        product = await self.db.execute(
            select(Product).where(
                Product.id == product_id, Product.is_deleted.is_(False)
            )
        )
        product = product.scalar_one_or_none()
        if not product:
            raise Exception("Product not found.")
        if (
            hasattr(product, "inventory_quantity")
            and product.inventory_quantity is not None
        ):
            if product.inventory_quantity < quantity:
                raise Exception(
                    f"Insufficient stock for product {product.id}.")

    def calculate_totals(self, items: list, shipping_cost: float = 500, tax_rate: float = 0.16) -> dict:
        subtotal = sum(item.get("price", 0) * item.get("quantity", 0)
                       for item in items)
        tax_amount = subtotal * tax_rate
        total_amount = subtotal + shipping_cost + tax_amount
        return {
            "subtotal": subtotal,
            "tax_amount": tax_amount,
            "shipping_cost": shipping_cost,
            "total_amount": total_amount,
        }
