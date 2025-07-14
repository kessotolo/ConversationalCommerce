from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.app.api.deps import get_db, get_current_buyer
from app.app.schemas.payment_method import (
    PaymentMethodCreate,
    PaymentMethodUpdate,
    PaymentMethodResponse,
)
from app.app.services.payment_method_service import (
    PaymentMethodService,
    PaymentMethodNotFoundError,
)

router = APIRouter()


@router.post("/", response_model=PaymentMethodResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_method(
    payment_data: PaymentMethodCreate,
    db: AsyncSession = Depends(get_db),
    buyer = Depends(get_current_buyer)
):
    """
    Create a new saved payment method.
    """
    payment_service = PaymentMethodService(db)
    payment_method = await payment_service.create_payment_method(
        payment_data=payment_data,
        customer_id=buyer.id,
        tenant_id=buyer.tenant_id,
    )
    return payment_method


@router.get("/", response_model=List[PaymentMethodResponse])
async def get_payment_methods(
    db: AsyncSession = Depends(get_db),
    buyer = Depends(get_current_buyer)
):
    """
    Get all saved payment methods for the current buyer.
    """
    payment_service = PaymentMethodService(db)
    payment_methods = await payment_service.get_payment_methods(
        customer_id=buyer.id,
        tenant_id=buyer.tenant_id,
    )
    return payment_methods


@router.get("/{payment_method_id}", response_model=PaymentMethodResponse)
async def get_payment_method(
    payment_method_id: UUID,
    db: AsyncSession = Depends(get_db),
    buyer = Depends(get_current_buyer)
):
    """
    Get a specific payment method.
    """
    try:
        payment_service = PaymentMethodService(db)
        payment_method = await payment_service.get_payment_method(
            payment_method_id=payment_method_id,
            customer_id=buyer.id,
            tenant_id=buyer.tenant_id,
        )
        return payment_method
    except PaymentMethodNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.patch("/{payment_method_id}", response_model=PaymentMethodResponse)
async def update_payment_method(
    payment_method_id: UUID,
    payment_update: PaymentMethodUpdate,
    db: AsyncSession = Depends(get_db),
    buyer = Depends(get_current_buyer)
):
    """
    Update a saved payment method.
    """
    try:
        payment_service = PaymentMethodService(db)
        updated_payment_method = await payment_service.update_payment_method(
            payment_method_id=payment_method_id,
            payment_update=payment_update,
            customer_id=buyer.id,
            tenant_id=buyer.tenant_id,
        )
        return updated_payment_method
    except PaymentMethodNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/{payment_method_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment_method(
    payment_method_id: UUID,
    db: AsyncSession = Depends(get_db),
    buyer = Depends(get_current_buyer)
):
    """
    Delete a saved payment method.
    """
    try:
        payment_service = PaymentMethodService(db)
        await payment_service.delete_payment_method(
            payment_method_id=payment_method_id,
            customer_id=buyer.id,
            tenant_id=buyer.tenant_id,
        )
    except PaymentMethodNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/{payment_method_id}/default", response_model=PaymentMethodResponse)
async def set_default_payment_method(
    payment_method_id: UUID,
    db: AsyncSession = Depends(get_db),
    buyer = Depends(get_current_buyer)
):
    """
    Set a payment method as the default.
    """
    try:
        payment_service = PaymentMethodService(db)
        payment_method = await payment_service.set_default_payment_method(
            payment_method_id=payment_method_id,
            customer_id=buyer.id,
            tenant_id=buyer.tenant_id,
        )
        return payment_method
    except PaymentMethodNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
