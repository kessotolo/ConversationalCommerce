from app.api.deps import get_current_buyer, get_db
from app.models.customer import Customer
from app.schemas.customer import Customer as CustomerSchema
from app.schemas.customer import CustomerUpdate
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/", response_model=CustomerSchema)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    buyer=Depends(get_current_buyer),
):
    result = await db.execute(select(Customer).where(Customer.id == buyer.id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.patch("/", response_model=CustomerSchema)
async def update_profile(
    profile_in: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    buyer=Depends(get_current_buyer),
):
    result = await db.execute(select(Customer).where(Customer.id == buyer.id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    for field, value in profile_in.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    await db.commit()
    await db.refresh(customer)
    return customer
