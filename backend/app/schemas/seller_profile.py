from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID


class SellerProfileBase(BaseModel):
    store_name: Optional[str] = None
    slug: Optional[str] = None
    bio: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    whatsapp_number: Optional[str] = Field(
        None, description="Merchant's WhatsApp number")
    instagram_handle: Optional[str] = Field(
        None, description="Merchant's Instagram handle")
    facebook_page: Optional[str] = Field(
        None, description="Merchant's Facebook page")
    tiktok_handle: Optional[str] = Field(
        None, description="Merchant's TikTok handle")


class SellerProfileCreate(SellerProfileBase):
    pass


class SellerProfileUpdate(SellerProfileBase):
    pass


class SellerProfileResponse(SellerProfileBase):
    id: UUID
    user_id: str

    model_config = ConfigDict(from_attributes=True)
