from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import Any
from backend.app.services.seller_onboarding_service import SellerOnboardingService, OnboardingError, DomainConflictError
from backend.app.schemas.onboarding import (
    OnboardingStartRequest, KYCRequest, DomainRequest, TeamInviteRequest, KYCUploadResponse
)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])
service = SellerOnboardingService()

# TODO: Extract tenant_id from auth/session context in production


def get_tenant_id():
    # Placeholder: in real code, extract from auth/session
    return "00000000-0000-0000-0000-000000000000"


@router.post("/start")
async def start_onboarding(payload: OnboardingStartRequest, tenant_id: str = Depends(get_tenant_id)):
    try:
        result = await service.start_onboarding(tenant_id, payload.dict())
        # TODO: Log onboarding_started event
        return result
    except OnboardingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Unexpected error during onboarding start.")


@router.post("/kyc")
async def submit_kyc(payload: KYCRequest, tenant_id: str = Depends(get_tenant_id)):
    try:
        result = await service.submit_kyc(tenant_id, payload.merchant_id, payload.dict())
        # TODO: Log kyc_submitted event
        return result
    except OnboardingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Unexpected error during KYC submission.")


@router.post("/domain")
async def set_domain(payload: DomainRequest, tenant_id: str = Depends(get_tenant_id)):
    try:
        result = await service.set_domain(tenant_id, payload.merchant_id, payload.domain)
        # TODO: Log domain_set event
        return result
    except DomainConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except OnboardingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Unexpected error during domain setup.")


@router.post("/team-invite")
async def invite_team_member(payload: TeamInviteRequest, tenant_id: str = Depends(get_tenant_id)):
    try:
        result = await service.invite_team_member(tenant_id, payload.merchant_id, payload.dict())
        # TODO: Log team_invited event
        return result
    except OnboardingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Unexpected error during team invite.")


@router.post("/upload-doc", response_model=KYCUploadResponse)
async def upload_kyc_document(merchant_id: str, file: UploadFile = File(...), tenant_id: str = Depends(get_tenant_id)):
    try:
        result = await service.upload_kyc_document(tenant_id, merchant_id, file)
        # TODO: Log kyc_doc_uploaded event
        return result
    except OnboardingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Unexpected error during KYC document upload.")
