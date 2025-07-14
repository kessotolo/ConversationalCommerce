import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.app.api.deps import get_db, get_current_buyer
from app.app.models.address_book import AddressBook as AddressBookModel
from app.app.schemas.address_book import AddressBookCreate, AddressBookUpdate, AddressBookResponse

router = APIRouter()


@router.post("/", response_model=AddressBookResponse, status_code=status.HTTP_201_CREATED)
async def create_address(address_in: AddressBookCreate, db: AsyncSession = Depends(get_db), buyer=Depends(get_current_buyer)):
    address = AddressBookModel(
        **address_in.dict(), customer_id=buyer.id, tenant_id=buyer.tenant_id
    )
    db.add(address)
    await db.commit()
    await db.refresh(address)
    return address


@router.get("/", response_model=list[AddressBookResponse])
async def list_addresses(db: AsyncSession = Depends(get_db), buyer=Depends(get_current_buyer)):
    result = await db.execute(
        select(AddressBookModel).where(
            AddressBookModel.customer_id == buyer.id,
            AddressBookModel.tenant_id == buyer.tenant_id
        )
    )
    return result.scalars().all()


@router.get("/{address_id}", response_model=AddressBookResponse)
async def get_address(address_id: uuid.UUID, db: AsyncSession = Depends(get_db), buyer=Depends(get_current_buyer)):
    result = await db.execute(
        select(AddressBookModel).where(
            AddressBookModel.id == address_id,
            AddressBookModel.customer_id == buyer.id,
            AddressBookModel.tenant_id == buyer.tenant_id
        )
    )
    address = result.scalars().first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    return address


@router.put("/{address_id}", response_model=AddressBookResponse)
async def update_address(address_id: uuid.UUID, address_in: AddressBookUpdate, db: AsyncSession = Depends(get_db), buyer=Depends(get_current_buyer)):
    result = await db.execute(
        select(AddressBookModel).where(
            AddressBookModel.id == address_id,
            AddressBookModel.customer_id == buyer.id,
            AddressBookModel.tenant_id == buyer.tenant_id
        )
    )
    address = result.scalars().first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    for field, value in address_in.dict(exclude_unset=True).items():
        setattr(address, field, value)
    await db.commit()
    await db.refresh(address)
    return address


@router.patch("/{address_id}", response_model=AddressBookResponse)
async def patch_address(address_id: uuid.UUID, address_in: AddressBookUpdate, db: AsyncSession = Depends(get_db), buyer=Depends(get_current_buyer)):
    result = await db.execute(
        select(AddressBookModel).where(
            AddressBookModel.id == address_id,
            AddressBookModel.customer_id == buyer.id,
            AddressBookModel.tenant_id == buyer.tenant_id
        )
    )
    address = result.scalars().first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    for field, value in address_in.dict(exclude_unset=True).items():
        setattr(address, field, value)
    await db.commit()
    await db.refresh(address)
    return address


@router.delete("/{address_id}", status_code=204)
async def delete_address(address_id: uuid.UUID, db: AsyncSession = Depends(get_db), buyer=Depends(get_current_buyer)):
    result = await db.execute(
        select(AddressBookModel).where(
            AddressBookModel.id == address_id,
            AddressBookModel.customer_id == buyer.id,
            AddressBookModel.tenant_id == buyer.tenant_id
        )
    )
    address = result.scalars().first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    await db.delete(address)
    await db.commit()
    return None


@router.patch("/{address_id}/default", response_model=AddressBookResponse)
async def set_default_address(address_id: uuid.UUID, db: AsyncSession = Depends(get_db), buyer=Depends(get_current_buyer)):
    # Unset previous default
    await db.execute(
        update(AddressBookModel)
        .where(
            AddressBookModel.customer_id == buyer.id,
            AddressBookModel.tenant_id == buyer.tenant_id,
            AddressBookModel.is_default.is_(True),
        )
        .values(is_default=False)
    )
    # Set new default
    result = await db.execute(
        select(AddressBookModel).where(
            AddressBookModel.id == address_id,
            AddressBookModel.customer_id == buyer.id,
            AddressBookModel.tenant_id == buyer.tenant_id
        )
    )
    address = result.scalars().first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    address.is_default = True
    await db.commit()
    await db.refresh(address)
    return address
