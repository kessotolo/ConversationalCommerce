from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.seller_profile import SellerProfile
from app.schemas.seller_profile import SellerProfileResponse, SellerProfileUpdate

router = APIRouter(
    prefix="/api/dashboard",
    tags=["dashboard"],
    responses={404: {"description": "Not found"}},
)


@router.get("/seller-profile/{user_id}", response_model=SellerProfileResponse)
def get_seller_profile(user_id: str, db: Session = Depends(get_db)):
    profile = db.query(SellerProfile).filter(
        SellerProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Seller profile not found")
    return profile


@router.put("/seller-profile/{user_id}", response_model=SellerProfileResponse)
def update_seller_profile(
    user_id: str, update: SellerProfileUpdate, db: Session = Depends(get_db)
):
    profile = db.query(SellerProfile).filter(
        SellerProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Seller profile not found")
    for field, value in update.dict(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile
