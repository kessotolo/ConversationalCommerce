import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_buyer
from app.models.saved_payment_method import SavedPaymentMethod as SavedPaymentMethodModel
from app.schemas.saved_payment_method import (
    SavedPaymentMethodCreate, SavedPaymentMethodUpdate, SavedPaymentMethodResponse
)

router = APIRouter()


@router.post("/", response_model=SavedPaymentMethodResponse)
def create_payment_method(payment_method_in: SavedPaymentMethodCreate, db: Session = Depends(get_db), buyer=Depends(get_current_buyer)):
    payment_method = SavedPaymentMethodModel(
        **payment_method_in.dict(), customer_id=buyer.id, tenant_id=buyer.tenant_id)
    db.add(payment_method)
    db.commit()
    db.refresh(payment_method)
    return payment_method


@router.get("/", response_model=list[SavedPaymentMethodResponse])
def list_payment_methods(db: Session = Depends(get_db), buyer=Depends(get_current_buyer)):
    methods = db.query(SavedPaymentMethodModel).filter(
        SavedPaymentMethodModel.customer_id == buyer.id,
        SavedPaymentMethodModel.tenant_id == buyer.tenant_id
    ).all()
    return methods


@router.get("/{method_id}", response_model=SavedPaymentMethodResponse)
def get_payment_method(method_id: uuid.UUID, db: Session = Depends(get_db), buyer=Depends(get_current_buyer)):
    method = db.query(SavedPaymentMethodModel).filter(
        SavedPaymentMethodModel.id == method_id,
        SavedPaymentMethodModel.customer_id == buyer.id,
        SavedPaymentMethodModel.tenant_id == buyer.tenant_id
    ).first()
    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return method


@router.put("/{method_id}", response_model=SavedPaymentMethodResponse)
def update_payment_method(method_id: uuid.UUID, payment_method_in: SavedPaymentMethodUpdate, db: Session = Depends(get_db), buyer=Depends(get_current_buyer)):
    method = db.query(SavedPaymentMethodModel).filter(
        SavedPaymentMethodModel.id == method_id,
        SavedPaymentMethodModel.customer_id == buyer.id,
        SavedPaymentMethodModel.tenant_id == buyer.tenant_id
    ).first()
    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")
    for field, value in payment_method_in.dict(exclude_unset=True).items():
        setattr(method, field, value)
    db.commit()
    db.refresh(method)
    return method


@router.delete("/{method_id}", status_code=204)
def delete_payment_method(method_id: uuid.UUID, db: Session = Depends(get_db), buyer=Depends(get_current_buyer)):
    method = db.query(SavedPaymentMethodModel).filter(
        SavedPaymentMethodModel.id == method_id,
        SavedPaymentMethodModel.customer_id == buyer.id,
        SavedPaymentMethodModel.tenant_id == buyer.tenant_id
    ).first()
    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")
    db.delete(method)
    db.commit()
    return None
