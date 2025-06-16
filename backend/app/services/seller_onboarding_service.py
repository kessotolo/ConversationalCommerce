from typing import Any, Dict
from uuid import UUID


class SellerOnboardingService:
    async def start_onboarding(self, merchant_data: Dict[str, Any]) -> Dict[str, Any]:
        # TODO: Implement merchant draft creation and log onboarding_started event
        pass

    async def submit_kyc(self, merchant_id: UUID, kyc_data: Dict[str, Any]) -> Dict[str, Any]:
        # TODO: Implement KYC submission and log kyc_submitted event
        pass

    async def set_domain(self, merchant_id: UUID, domain: str) -> Dict[str, Any]:
        # TODO: Validate and reserve domain, log domain_set event
        pass

    async def invite_team_member(self, merchant_id: UUID, invite_data: Dict[str, Any]) -> Dict[str, Any]:
        # TODO: Generate invite link, log team_invited event
        pass

    async def upload_kyc_document(self, merchant_id: UUID, file_data: Any) -> Dict[str, Any]:
        # TODO: Integrate with Cloudinary, store KYC status, log kyc_doc_uploaded event
        pass
