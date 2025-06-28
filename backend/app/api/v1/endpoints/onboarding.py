from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.services.seller_onboarding_service import SellerOnboardingService, OnboardingError, DomainConflictError
from backend.app.schemas.onboarding import (
    OnboardingStartRequest, OnboardingStartResponse, KYCRequest, KYCResponse, DomainRequest, DomainResponse, TeamInviteRequest, TeamInviteResponseModel, KYCUploadResponse, OnboardingStatusResponse, KYCReviewRequest
)
from backend.app.db.session import get_db
from backend.app.core.security.dependencies import require_auth
from backend.app.core.security.clerk import ClerkTokenData
from uuid import UUID

router = APIRouter(prefix="/onboarding", tags=["onboarding"])
service = SellerOnboardingService()


def extract_tenant_id(token_data: ClerkTokenData) -> str:
    # Prefer store_id in metadata, fallback to sub (user_id)
    tenant_id = None
    if token_data.metadata and "store_id" in token_data.metadata:
        tenant_id = token_data.metadata["store_id"]
    else:
        tenant_id = str(token_data.sub)
    # Validate UUID format
    try:
        UUID(tenant_id)
    except Exception:
        raise HTTPException(
            status_code=400, detail="Invalid or missing tenant_id in token.")
    return tenant_id


@router.post("/start", response_model=OnboardingStartResponse)
async def start_onboarding(
    payload: OnboardingStartRequest,
    db: AsyncSession = Depends(get_db),
    token_data: ClerkTokenData = Depends(require_auth),
):
    tenant_id = extract_tenant_id(token_data)
    try:
        result = await service.start_onboarding(tenant_id, payload.dict(), db)
        return result
    except DomainConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except OnboardingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Unexpected error during onboarding start.")


@router.post("/kyc", response_model=KYCResponse)
async def submit_kyc(
    payload: KYCRequest,
    db: AsyncSession = Depends(get_db),
    token_data: ClerkTokenData = Depends(require_auth),
):
    tenant_id = extract_tenant_id(token_data)
    try:
        result = await service.submit_kyc(tenant_id, payload.dict(), db)
        return result
    except OnboardingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Unexpected error during KYC submission.")


@router.post("/domain", response_model=DomainResponse)
async def set_domain(
    payload: DomainRequest,
    db: AsyncSession = Depends(get_db),
    token_data: ClerkTokenData = Depends(require_auth),
):
    tenant_id = extract_tenant_id(token_data)
    try:
        result = await service.set_domain(tenant_id, payload.domain, db)
        return result
    except DomainConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except OnboardingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Unexpected error during domain setup.")


@router.post("/team-invite", response_model=TeamInviteResponseModel)
async def invite_team_member(
    payload: TeamInviteRequest,
    db: AsyncSession = Depends(get_db),
    token_data: ClerkTokenData = Depends(require_auth),
):
    tenant_id = extract_tenant_id(token_data)
    try:
        result = await service.invite_team_member(tenant_id, payload.dict(), db)
        return result
    except OnboardingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Unexpected error during team invite.")


@router.post("/upload-doc", response_model=KYCUploadResponse)
async def upload_kyc_document(
    kyc_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    token_data: ClerkTokenData = Depends(require_auth),
):
    tenant_id = extract_tenant_id(token_data)
    try:
        result = await service.upload_kyc_document(tenant_id, kyc_id, file, db)
        return result
    except OnboardingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Unexpected error during KYC document upload.")


@router.get("/status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    db: AsyncSession = Depends(get_db),
    token_data: ClerkTokenData = Depends(require_auth),
):
    tenant_id = extract_tenant_id(token_data)
    try:
        result = await service.get_onboarding_status(tenant_id, db)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch onboarding status.")


@router.post("/kyc/review", response_model=KYCResponse)
async def review_kyc(
    payload: KYCReviewRequest,
    db: AsyncSession = Depends(get_db),
    token_data: ClerkTokenData = Depends(require_auth),
):
    # TODO: Add admin role check here
    try:
        result = await service.review_kyc(payload.kyc_id, payload.action, db)
        return result
    except OnboardingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Unexpected error during KYC review.")
