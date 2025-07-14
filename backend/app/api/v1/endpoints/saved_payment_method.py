import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_db, get_current_buyer
from app.models.saved_payment_method import SavedPaymentMethod as SavedPaymentMethodModel
from app.schemas.saved_payment_method import (
    SavedPaymentMethodCreate, SavedPaymentMethodUpdate, SavedPaymentMethodResponse
)

router = APIRouter()


@router.post("/", response_model=SavedPaymentMethodResponse)
async def create_payment_method(payment_method_in: SavedPaymentMethodCreate, db: AsyncSession = Depends(get_db), buyer=Depends(get_current_buyer)):
    payment_method = SavedPaymentMethodModel(
        **payment_method_in.dict(), customer_id=buyer.id, tenant_id=buyer.tenant_id)
    db.add(payment_method)
    await db.commit()
    await db.refresh(payment_method)
    return payment_method


@router.get("/", response_model=list[SavedPaymentMethodResponse])
async def list_payment_methods(db: AsyncSession = Depends(get_db), buyer=Depends(get_current_buyer)):
    result = await db.execute(
        select(SavedPaymentMethodModel).where(
            SavedPaymentMethodModel.customer_id == buyer.id,
            SavedPaymentMethodModel.tenant_id == buyer.tenant_id
        )
    )
    return result.scalars().all()


@router.get("/{method_id}", response_model=SavedPaymentMethodResponse)
async def get_payment_method(method_id: uuid.UUID, db: AsyncSession = Depends(get_db), buyer=Depends(get_current_buyer)):
    result = await db.execute(
        select(SavedPaymentMethodModel).where(
            SavedPaymentMethodModel.id == method_id,
            SavedPaymentMethodModel.customer_id == buyer.id,
            SavedPaymentMethodModel.tenant_id == buyer.tenant_id
        )
    )
    method = result.scalars().first()
    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return method


@router.put("/{method_id}", response_model=SavedPaymentMethodResponse)
async def update_payment_method(method_id: uuid.UUID, payment_method_in: SavedPaymentMethodUpdate, db: AsyncSession = Depends(get_db), buyer=Depends(get_current_buyer)):
    result = await db.execute(
        select(SavedPaymentMethodModel).where(
            SavedPaymentMethodModel.id == method_id,
            SavedPaymentMethodModel.customer_id == buyer.id,
            SavedPaymentMethodModel.tenant_id == buyer.tenant_id
        )
    )
    method = result.scalars().first()
    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")
    for field, value in payment_method_in.dict(exclude_unset=True).items():
        setattr(method, field, value)
    await db.commit()
    await db.refresh(method)
    return method


@router.delete("/{method_id}", status_code=204)
async def delete_payment_method(method_id: uuid.UUID, db: AsyncSession = Depends(get_db), buyer=Depends(get_current_buyer)):
    result = await db.execute(
        select(SavedPaymentMethodModel).where(
            SavedPaymentMethodModel.id == method_id,
            SavedPaymentMethodModel.customer_id == buyer.id,
            SavedPaymentMethodModel.tenant_id == buyer.tenant_id
        )
    )
    method = result.scalars().first()
    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")
    await db.delete(method)
    await db.commit()
    return None
