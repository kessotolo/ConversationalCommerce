from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from uuid import UUID


class OnboardingStartRequest(BaseModel):
    business_name: str = Field(..., description="Merchant business name")
    phone: str = Field(..., description="Merchant phone number")
    email: Optional[str] = Field(None, description="Merchant email address")
    # Add more fields as needed


class KYCRequest(BaseModel):
    merchant_id: UUID
    id_number: str = Field(..., description="Government-issued ID number")
    id_type: str = Field(...,
                         description="Type of ID (passport, national, etc.)")
    business_info: Dict[str,
                        Any] = Field(..., description="Additional business info")
    # Add more fields as needed


class DomainRequest(BaseModel):
    merchant_id: UUID
    domain: str = Field(...,
                        description="Requested subdomain or custom domain")


class TeamInviteRequest(BaseModel):
    merchant_id: UUID
    invitee_phone: str = Field(...,
                               description="Phone number of team member to invite")
    role: Optional[str] = Field(None, description="Role for the invitee")


class KYCUploadResponse(BaseModel):
    status: str = Field(..., description="KYC document upload status")
    message: Optional[str] = Field(
        None, description="Additional info or error message")
