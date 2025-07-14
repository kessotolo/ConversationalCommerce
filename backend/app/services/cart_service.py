from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session
from sqlalchemy.sql import select

from app.app.api.v1.endpoints.cart import get_or_create_cart
from app.app.db.async_session import get_async_session_local
from app.app.models.cart import Cart

# Service to get cart by phone number (for conversational flows)


def get_cart_by_phone(
    phone_number: str, tenant_id: str, db: Session
) -> Optional[Dict[str, Any]]:
    cart = get_or_create_cart(db, tenant_id, None, phone_number, None)
    if not cart:
        return None
    # Return a dict representation for compatibility
    return {
        "id": str(cart.id),
        "items": [
            {
                "product_id": str(item.product_id),
                "name": (
                    getattr(item, "product", None).name
                    if getattr(item, "product", None)
                    else None
                ),
                "quantity": item.quantity,
                "price": item.price_at_add,
                "variant_id": str(item.variant_id) if item.variant_id else None,
                "variant_name": (
                    getattr(item, "variant", None).name
                    if getattr(item, "variant", None)
                    else None
                ),
                "image_url": (
                    getattr(item, "product", None).image_url
                    if getattr(item, "product", None)
                    else None
                ),
            }
            for item in getattr(cart, "items", [])
        ],
    }


# Service to clear cart by phone number and tenant


async def clear_cart(phone_number: str, tenant_id: str, db: Session):
    cart = get_or_create_cart(db, tenant_id, None, phone_number, None)
    if not cart:
        return
    for item in list(cart.items):
        db.delete(item)
    cart.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cart)


class CartService:
    @staticmethod
    async def get_cart_by_phone(phone_number: str, tenant_id: str, db=None):
        db = db or get_async_session_local()()
        try:
            # Replace with actual async DB query
            result = await db.execute(
                select(Cart).where(
                    Cart.phone_number == phone_number, Cart.tenant_id == tenant_id
                )
            )
            cart = result.scalar_one_or_none()
            return cart
        finally:
            await db.close()

    @staticmethod
    async def clear_cart(phone_number: str, tenant_id: str, db=None):
        db = db or get_async_session_local()()
        try:
            # Replace with actual async DB query
            result = await db.execute(
                select(Cart).where(
                    Cart.phone_number == phone_number, Cart.tenant_id == tenant_id
                )
            )
            cart = result.scalar_one_or_none()
            if cart:
                await db.delete(cart)
                await db.commit()
            return True
        finally:
            await db.close()


def get_cart_service():
    return CartService
