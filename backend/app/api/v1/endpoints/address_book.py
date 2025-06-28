import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_buyer
from app.models.address_book import AddressBook as AddressBookModel
from app.schemas.address_book import AddressBookCreate, AddressBookUpdate, AddressBookResponse

router = APIRouter()


@router.post("/", response_model=AddressBookResponse, status_code=status.HTTP_201_CREATED)
def create_address(address_in: AddressBookCreate, db: Session = Depends(get_db), buyer=Depends(get_current_buyer)):
    address = AddressBookModel(
        **address_in.dict(), customer_id=buyer.id, tenant_id=buyer.tenant_id)
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


@router.get("/", response_model=list[AddressBookResponse])
def list_addresses(db: Session = Depends(get_db), buyer=Depends(get_current_buyer)):
    addresses = db.query(AddressBookModel).filter(
        AddressBookModel.customer_id == buyer.id,
        AddressBookModel.tenant_id == buyer.tenant_id
    ).all()
    return addresses


@router.get("/{address_id}", response_model=AddressBookResponse)
def get_address(address_id: uuid.UUID, db: Session = Depends(get_db), buyer=Depends(get_current_buyer)):
    address = db.query(AddressBookModel).filter(
        AddressBookModel.id == address_id,
        AddressBookModel.customer_id == buyer.id,
        AddressBookModel.tenant_id == buyer.tenant_id
    ).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    return address


@router.put("/{address_id}", response_model=AddressBookResponse)
def update_address(address_id: uuid.UUID, address_in: AddressBookUpdate, db: Session = Depends(get_db), buyer=Depends(get_current_buyer)):
    address = db.query(AddressBookModel).filter(
        AddressBookModel.id == address_id,
        AddressBookModel.customer_id == buyer.id,
        AddressBookModel.tenant_id == buyer.tenant_id
    ).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    for field, value in address_in.dict(exclude_unset=True).items():
        setattr(address, field, value)
    db.commit()
    db.refresh(address)
    return address


@router.patch("/{address_id}", response_model=AddressBookResponse)
def patch_address(address_id: uuid.UUID, address_in: AddressBookUpdate, db: Session = Depends(get_db), buyer=Depends(get_current_buyer)):
    address = db.query(AddressBookModel).filter(
        AddressBookModel.id == address_id,
        AddressBookModel.customer_id == buyer.id,
        AddressBookModel.tenant_id == buyer.tenant_id
    ).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    for field, value in address_in.dict(exclude_unset=True).items():
        setattr(address, field, value)
    db.commit()
    db.refresh(address)
    return address


@router.delete("/{address_id}", status_code=204)
def delete_address(address_id: uuid.UUID, db: Session = Depends(get_db), buyer=Depends(get_current_buyer)):
    address = db.query(AddressBookModel).filter(
        AddressBookModel.id == address_id,
        AddressBookModel.customer_id == buyer.id,
        AddressBookModel.tenant_id == buyer.tenant_id
    ).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    db.delete(address)
    db.commit()
    return None


@router.patch("/{address_id}/default", response_model=AddressBookResponse)
def set_default_address(address_id: uuid.UUID, db: Session = Depends(get_db), buyer=Depends(get_current_buyer)):
    # Unset previous default
    db.query(AddressBookModel).filter(
        AddressBookModel.customer_id == buyer.id,
        AddressBookModel.tenant_id == buyer.tenant_id,
        AddressBookModel.is_default == True
    ).update({"is_default": False})
    # Set new default
    address = db.query(AddressBookModel).filter(
        AddressBookModel.id == address_id,
        AddressBookModel.customer_id == buyer.id,
        AddressBookModel.tenant_id == buyer.tenant_id
    ).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    address.is_default = True
    db.commit()
    db.refresh(address)
    return address
