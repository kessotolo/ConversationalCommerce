from typing import Any, Dict
from uuid import UUID
from backend.app.schemas.onboarding import (
    OnboardingStartRequest, KYCRequest, DomainRequest, TeamInviteRequest
)
from backend.app.schemas.conversation_event import ConversationEventType
from backend.app.models.conversation_event import ConversationEvent
from backend.app.models.tenant import Tenant
from backend.app.core.cloudinary.client import CloudinaryClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
# from backend.app.db.session import async_session (TODO: import your async DB session)
# from backend.app.utils.cloudinary import upload_file_to_cloudinary (TODO: implement this)


class OnboardingError(Exception):
    pass


class DomainConflictError(OnboardingError):
    pass


async def log_conversation_event_to_db(event_type: ConversationEventType, tenant_id: UUID, payload: dict, db: AsyncSession):
    event = ConversationEvent(
        event_type=event_type,
        tenant_id=tenant_id,
        payload=payload,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


class SellerOnboardingService:
    async def start_onboarding(self, tenant_id: UUID, merchant_data: Dict[str, Any], db: AsyncSession) -> Dict[str, Any]:
        # Create merchant draft (Tenant)
        try:
            new_tenant = Tenant(
                id=tenant_id,
                name=merchant_data["business_name"],
                subdomain=merchant_data["subdomain"],
                whatsapp_number=merchant_data.get("phone"),
                is_active=False,  # Not active until KYC complete
            )
            db.add(new_tenant)
            await db.commit()
            await db.refresh(new_tenant)
        except IntegrityError:
            raise DomainConflictError("Subdomain is already taken.")
        await log_conversation_event_to_db(ConversationEventType.message_sent, tenant_id, {"step": "onboarding_started"}, db)
        return {"status": "success", "message": "Onboarding started", "tenant_id": str(new_tenant.id)}

    async def submit_kyc(self, tenant_id: UUID, merchant_id: UUID, kyc_data: Dict[str, Any], db: AsyncSession) -> Dict[str, Any]:
        # TODO: Implement KYCInfo model/table for storing KYC data
        # Example: kyc_info = KYCInfo(tenant_id=tenant_id, ...)
        # db.add(kyc_info)
        # await db.commit()
        await log_conversation_event_to_db(ConversationEventType.message_sent, tenant_id, {"step": "kyc_submitted"}, db)
        return {"status": "success", "message": "KYC submitted"}

    async def set_domain(self, tenant_id: UUID, merchant_id: UUID, domain: str, db: AsyncSession) -> Dict[str, Any]:
        # Check for domain conflict
        result = await db.execute(select(Tenant).where(Tenant.subdomain == domain))
        existing = result.scalar_one_or_none()
        if existing:
            raise DomainConflictError("Domain is already taken.")
        # Set domain for tenant
        tenant = await db.get(Tenant, merchant_id)
        if not tenant or tenant.id != tenant_id:
            raise OnboardingError("Tenant not found or access denied.")
        tenant.subdomain = domain
        await db.commit()
        await db.refresh(tenant)
        await log_conversation_event_to_db(ConversationEventType.message_sent, tenant_id, {"step": "domain_set", "domain": domain}, db)
        return {"status": "success", "message": f"Domain {domain} set"}

    async def invite_team_member(self, tenant_id: UUID, merchant_id: UUID, invite_data: Dict[str, Any], db: AsyncSession) -> Dict[str, Any]:
        # TODO: Implement TeamInvite model/table for storing invites
        # Example: invite = TeamInvite(tenant_id=tenant_id, ...)
        # db.add(invite)
        # await db.commit()
        # Example only
        invite_link = f"https://wa.me/{invite_data.get('invitee_phone')}?text=Join+my+team"
        await log_conversation_event_to_db(ConversationEventType.message_sent, tenant_id, {"step": "team_invited", "invitee": invite_data.get('invitee_phone')}, db)
        return {"status": "success", "invite_link": invite_link}

    async def upload_kyc_document(self, tenant_id: UUID, merchant_id: UUID, file_data: Any, db: AsyncSession) -> Dict[str, Any]:
        # Upload file to Cloudinary
        upload_result = await CloudinaryClient.upload_file(file_data, folder=f"kyc/{tenant_id}")
        file_url = upload_result.get("secure_url")
        # TODO: Store file_url in KYCInfo table
        await log_conversation_event_to_db(ConversationEventType.message_sent, tenant_id, {"step": "kyc_doc_uploaded", "file_url": file_url}, db)
        return {"status": "success", "message": "KYC document uploaded", "file_url": file_url}
