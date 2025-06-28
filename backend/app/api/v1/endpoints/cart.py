from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api import deps
from app.core.security.clerk import ClerkTokenData
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.schemas.cart import CartItemCreate, CartResponse

router = APIRouter()

# Helper to get or create cart by user/session/phone/tenant


def get_or_create_cart(
    db: Session,
    tenant_id: UUID,
    user_id: Optional[UUID],
    phone_number: Optional[str],
    session_id: Optional[str],
):
    cart = (
        db.query(Cart)
        .filter(
            Cart.tenant_id == tenant_id,
            (Cart.user_id == user_id)
            | (Cart.phone_number == phone_number)
            | (Cart.session_id == session_id),
        )
        .first()
    )
    if not cart:
        cart = Cart(
            tenant_id=tenant_id,
            user_id=user_id,
            phone_number=phone_number,
            session_id=session_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


@router.get("/cart", response_model=CartResponse)
def get_cart(
    tenant_id: UUID = Query(...),
    db: Session = Depends(deps.get_db),
    user: Optional[ClerkTokenData] = Depends(deps.get_current_user_optional),
    session_id: Optional[str] = Query(None),
    phone_number: Optional[str] = Query(None),
):
    user_id = user.sub if user else None
    cart = get_or_create_cart(db, tenant_id, user_id, phone_number, session_id)
    return cart


@router.post("/cart/add", response_model=CartResponse)
def add_to_cart(
    item: CartItemCreate = Body(...),
    tenant_id: UUID = Query(...),
    db: Session = Depends(deps.get_db),
    user: Optional[ClerkTokenData] = Depends(deps.get_current_user_optional),
    session_id: Optional[str] = Query(None),
    phone_number: Optional[str] = Query(None),
):
    user_id = user.sub if user else None
    cart = get_or_create_cart(db, tenant_id, user_id, phone_number, session_id)
    # Check if item already exists
    cart_item = next(
        (
            ci
            for ci in cart.items
            if ci.product_id == item.product_id and ci.variant_id == item.variant_id
        ),
        None,
    )
    if cart_item:
        cart_item.quantity += item.quantity
        cart_item.updated_at = datetime.utcnow()
    else:
        # Get product price
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        cart_item = CartItem(
            cart_id=cart.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price_at_add=product.price,
            variant_id=item.variant_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(cart_item)
        cart.items.append(cart_item)
    cart.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cart)
    return cart


@router.post("/cart/update", response_model=CartResponse)
def update_cart_item(
    product_id: UUID = Body(...),
    quantity: int = Body(...),
    variant_id: Optional[UUID] = Body(None),
    tenant_id: UUID = Query(...),
    db: Session = Depends(deps.get_db),
    user: Optional[ClerkTokenData] = Depends(deps.get_current_user_optional),
    session_id: Optional[str] = Query(None),
    phone_number: Optional[str] = Query(None),
):
    user_id = user.sub if user else None
    cart = get_or_create_cart(db, tenant_id, user_id, phone_number, session_id)
    cart_item = next(
        (
            ci
            for ci in cart.items
            if ci.product_id == product_id and ci.variant_id == variant_id
        ),
        None,
    )
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    cart_item.quantity = quantity
    cart_item.updated_at = datetime.utcnow()
    cart.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cart)
    return cart


@router.post("/cart/remove", response_model=CartResponse)
def remove_cart_item(
    product_id: UUID = Body(...),
    variant_id: Optional[UUID] = Body(None),
    tenant_id: UUID = Query(...),
    db: Session = Depends(deps.get_db),
    user: Optional[ClerkTokenData] = Depends(deps.get_current_user_optional),
    session_id: Optional[str] = Query(None),
    phone_number: Optional[str] = Query(None),
):
    user_id = user.sub if user else None
    cart = get_or_create_cart(db, tenant_id, user_id, phone_number, session_id)
    cart_item = next(
        (
            ci
            for ci in cart.items
            if ci.product_id == product_id and ci.variant_id == variant_id
        ),
        None,
    )
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.delete(cart_item)
    cart.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cart)
    return cart


@router.post("/cart/clear", response_model=CartResponse)
def clear_cart(
    tenant_id: UUID = Query(...),
    db: Session = Depends(deps.get_db),
    user: Optional[ClerkTokenData] = Depends(deps.get_current_user_optional),
    session_id: Optional[str] = Query(None),
    phone_number: Optional[str] = Query(None),
):
    user_id = user.sub if user else None
    cart = get_or_create_cart(db, tenant_id, user_id, phone_number, session_id)
    for item in list(cart.items):
        db.delete(item)
    cart.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cart)
    return cart
