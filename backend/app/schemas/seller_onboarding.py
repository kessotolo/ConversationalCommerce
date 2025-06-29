from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from uuid import UUID

from pydantic import BaseModel, Field


class SellerVerificationStatusEnum(str, Enum):
    pending = "pending"
    in_review = "in_review"
    approved = "approved"
    rejected = "rejected"
    additional_info_needed = "additional_info_needed"


class SellerVerificationTypeEnum(str, Enum):
    identity = "identity"
    business = "business"
    banking = "banking"
    tax = "tax"
    address = "address"


class VerificationBase(BaseModel):
    """Base schema for verification data."""
    verification_type: SellerVerificationTypeEnum
    verification_data: Optional[Dict[str, Any]] = None
    document_ids: Optional[List[str]] = None
    notes: Optional[str] = None


class VerificationCreate(VerificationBase):
    """Schema for creating a new verification request."""
    seller_id: UUID
    tenant_id: UUID


class VerificationUpdate(BaseModel):
    """Schema for updating a verification."""
    status: Optional[SellerVerificationStatusEnum] = None
    notes: Optional[str] = None
    verification_data: Optional[Dict[str, Any]] = None
    document_ids: Optional[List[str]] = None
    rejection_reason: Optional[str] = None
    additional_info_requested: Optional[str] = None


class VerificationAdminUpdate(BaseModel):
    """Schema for admin updates to a verification."""
    status: SellerVerificationStatusEnum
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    additional_info_requested: Optional[str] = None


class VerificationResponse(VerificationBase):
    """Schema for verification API responses."""
    id: UUID
    seller_id: UUID
    tenant_id: UUID
    status: SellerVerificationStatusEnum
    reviewed_by: Optional[UUID] = None
    rejection_reason: Optional[str] = None
    additional_info_requested: Optional[str] = None
    submitted_at: datetime
    updated_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OnboardingStatusBase(BaseModel):
    """Base schema for onboarding status."""
    is_approved: bool = False
    is_identity_verified: bool = False
    is_business_verified: bool = False
    is_banking_verified: bool = False
    is_tax_verified: bool = False
    is_address_verified: bool = False
    completed_steps: List[str] = Field(default_factory=list)
    current_step: Optional[str] = None


class OnboardingStatusCreate(OnboardingStatusBase):
    """Schema for creating a new onboarding status."""
    seller_id: UUID
    tenant_id: UUID


class OnboardingStatusUpdate(BaseModel):
    """Schema for updating an onboarding status."""
    is_approved: Optional[bool] = None
    is_identity_verified: Optional[bool] = None
    is_business_verified: Optional[bool] = None
    is_banking_verified: Optional[bool] = None
    is_tax_verified: Optional[bool] = None
    is_address_verified: Optional[bool] = None
    completed_steps: Optional[List[str]] = None
    current_step: Optional[str] = None
    completed_at: Optional[datetime] = None


class OnboardingStatusResponse(OnboardingStatusBase):
    """Schema for onboarding status API responses."""
    id: UUID
    seller_id: UUID
    tenant_id: UUID
    started_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    verifications: Optional[List[VerificationResponse]] = None

    class Config:
        from_attributes = True


class AdminDashboardStats(BaseModel):
    """Schema for admin dashboard statistics."""
    pending_verifications: int
    in_review_verifications: int
    approved_sellers: int
    rejected_verifications: int
    additional_info_needed: int
    
    # Count by verification type
    pending_identity: int = 0
    pending_business: int = 0
    pending_banking: int = 0
    pending_tax: int = 0
    pending_address: int = 0
