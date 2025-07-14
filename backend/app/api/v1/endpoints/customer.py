import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.models.customer import Customer as CustomerModel
from app.schemas.customer import Customer, CustomerCreate, CustomerUpdate
from app.core.security.password import get_password_hash, verify_password

router = APIRouter()


@router.post("/upsert", response_model=Customer)
def upsert_customer(customer_in: CustomerCreate, db: Session = Depends(get_db)):
    # Try to find by email, phone, instagram_handle, or whatsapp_id
    query = db.query(CustomerModel)
    filters = []
    if customer_in.email:
        filters.append(CustomerModel.email == customer_in.email)
    if customer_in.phone:
        filters.append(CustomerModel.phone == customer_in.phone)
    if customer_in.instagram_handle:
        filters.append(CustomerModel.instagram_handle ==
                       customer_in.instagram_handle)
    if customer_in.whatsapp_id:
        filters.append(CustomerModel.whatsapp_id == customer_in.whatsapp_id)
    customer = query.filter(*filters).first() if filters else None
    if customer:
        # Update last_activity and tags
        customer.last_activity = customer_in.last_activity or customer.last_activity
        if customer_in.tags:
            customer.tags = list(set((customer.tags or []) + customer_in.tags))
    else:
        customer = CustomerModel(**customer_in.dict())
        db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=Customer)
def get_customer(customer_id: uuid.UUID, db: Session = Depends(get_db)):
    customer = db.query(CustomerModel).filter(
        CustomerModel.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.put("/{customer_id}", response_model=Customer)
def update_customer(customer_id: uuid.UUID, customer_in: CustomerUpdate, db: Session = Depends(get_db)):
    customer = db.query(CustomerModel).filter(
        CustomerModel.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    for field, value in customer_in.dict(exclude_unset=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer


@router.put("/{customer_id}/password", response_model=Customer)
def update_customer_password(customer_id: uuid.UUID, new_password: str, db: Session = Depends(get_db)):
    customer = db.query(CustomerModel).filter(
        CustomerModel.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer.password_hash = get_password_hash(new_password)
    db.commit()
    db.refresh(customer)
    return customer


@router.post("/{customer_id}/verify_password", response_model=bool)
def verify_customer_password(customer_id: uuid.UUID, password: str, db: Session = Depends(get_db)):
    customer = db.query(CustomerModel).filter(
        CustomerModel.id == customer_id).first()
    if not customer or not customer.password_hash:
        return False
    return verify_password(password, customer.password_hash)
