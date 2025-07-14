from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
from app.app.schemas.kyc_info import KYCInfoCreate, KYCInfoResponse
from app.app.schemas.team_invite import TeamInviteCreate, TeamInviteResponse


class OnboardingStartRequest(BaseModel):
    business_name: str = Field(..., min_length=2,
                               max_length=100, description="Merchant business name")
    phone: str = Field(..., min_length=8, max_length=20,
                       description="Merchant phone number")
    email: Optional[str] = Field(None, description="Merchant email address")
    subdomain: str = Field(..., min_length=3, max_length=30,
                           pattern=r"^[a-z0-9-]+$", description="Requested subdomain")


class OnboardingStartResponse(BaseModel):
    status: str
    message: str
    tenant_id: UUID


class KYCRequest(KYCInfoCreate):
    tenant_id: UUID


class KYCResponse(KYCInfoResponse):
    pass


class DomainRequest(BaseModel):
    tenant_id: UUID
    domain: str = Field(..., min_length=3, max_length=30,
                        pattern=r"^[a-z0-9-]+$", description="Requested subdomain or custom domain")


class DomainResponse(BaseModel):
    status: str
    message: str
    domain: str


class TeamInviteRequest(TeamInviteCreate):
    tenant_id: UUID


class TeamInviteResponseModel(TeamInviteResponse):
    pass


class KYCUploadResponse(BaseModel):
    status: str
    message: Optional[str]
    file_url: Optional[str]


class OnboardingStatusResponse(BaseModel):
    business_info_complete: bool
    kyc_complete: bool
    kyc_upload_complete: bool
    domain_complete: bool
    team_invite_complete: bool
    overall_complete: bool
    current_step: Optional[str] = None
    message: Optional[str] = None


class KYCReviewRequest(BaseModel):
    kyc_id: UUID
    action: str = Field(..., pattern=r"^(approve|reject)$",
                        description="Action to take: approve or reject")


OnboardingRequest = OnboardingStartRequest
OnboardingResponse = OnboardingStartResponse
