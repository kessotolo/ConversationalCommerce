from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class KYCInfoBase(BaseModel):
    business_name: str = Field(..., min_length=2,
                               max_length=100, description="Business name")
    id_number: str = Field(..., min_length=4, max_length=50,
                           description="Government-issued ID number")
    id_type: str = Field(..., min_length=2, max_length=30,
                         description="Type of ID (passport, national, etc.)")


class KYCInfoCreate(KYCInfoBase):
    pass


class KYCInfoResponse(KYCInfoBase):
    id: UUID
    tenant_id: UUID
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    documents: Optional[List['KYCDocumentResponse']] = None
    model_config = ConfigDict(from_attributes=True)


class KYCDocumentBase(BaseModel):
    file_url: str = Field(..., description="Cloudinary file URL")
    file_type: str = Field(..., description="Type of file (image, pdf, etc.)")


class KYCDocumentCreate(KYCDocumentBase):
    pass


class KYCDocumentResponse(KYCDocumentBase):
    id: UUID
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


KYCInfoResponse.model_rebuild()
