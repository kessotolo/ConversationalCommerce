from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import Any
from backend.app.services.seller_onboarding_service import SellerOnboardingService
from backend.app.schemas.onboarding import (
    OnboardingStartRequest, KYCRequest, DomainRequest, TeamInviteRequest, KYCUploadResponse
)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])
service = SellerOnboardingService()


@router.post("/start")
async def start_onboarding(payload: OnboardingStartRequest):
    try:
        result = await service.start_onboarding(payload.dict())
        # TODO: Log onboarding_started event
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/kyc")
async def submit_kyc(payload: KYCRequest):
    try:
        result = await service.submit_kyc(payload.merchant_id, payload.dict())
        # TODO: Log kyc_submitted event
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/domain")
async def set_domain(payload: DomainRequest):
    try:
        result = await service.set_domain(payload.merchant_id, payload.domain)
        # TODO: Log domain_set event
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/team-invite")
async def invite_team_member(payload: TeamInviteRequest):
    try:
        result = await service.invite_team_member(payload.merchant_id, payload.dict())
        # TODO: Log team_invited event
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload-doc", response_model=KYCUploadResponse)
async def upload_kyc_document(merchant_id: str, file: UploadFile = File(...)):
    try:
        result = await service.upload_kyc_document(merchant_id, file)
        # TODO: Log kyc_doc_uploaded event
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
