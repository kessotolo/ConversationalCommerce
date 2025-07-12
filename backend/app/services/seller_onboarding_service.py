from typing import Any, Dict
from uuid import UUID
from backend.app.schemas.onboarding import (
    OnboardingRequest, OnboardingResponse, KYCInfoCreate, KYCInfoResponse, TeamInviteCreate, TeamInviteResponse, OnboardingStatusResponse
)
from backend.app.schemas.conversation_event import ConversationEventType
from backend.app.models.conversation_event import ConversationEvent
from backend.app.models.tenant import Tenant
from backend.app.models.kyc_info import KYCInfo, KYCStatusEnum
from backend.app.models.kyc_document import KYCDocument, KYCDocumentStatusEnum
from backend.app.models.team_invite import TeamInvite, TeamInviteStatusEnum
from backend.app.core.cloudinary.client import CloudinaryClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_
from backend.app.core.exceptions import AppError
from backend.app.core.notifications.notification_service import NotificationService, Notification, NotificationChannel, NotificationPriority
# The following imports are placeholders for future async DB session and Cloudinary integration.
# Uncomment and implement when those features are prioritized.
# from app.db.session import async_session
# from app.utils.cloudinary import upload_file_to_cloudinary


class OnboardingError(AppError):
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
    """
    Service for seller onboarding. All public methods require tenant_id as a valid UUID.
    """

    async def start_onboarding(self, tenant_id: UUID, merchant_data: Dict[str, Any], db: AsyncSession) -> Dict[str, Any]:
        try:
            new_tenant = Tenant(
                id=tenant_id,
                name=merchant_data["business_name"],
                subdomain=merchant_data["subdomain"],
                whatsapp_number=merchant_data.get("phone"),
                is_active=False,
            )
            db.add(new_tenant)
            await db.commit()
            await db.refresh(new_tenant)
        except IntegrityError:
            raise DomainConflictError("Subdomain is already taken.")
        await log_conversation_event_to_db(ConversationEventType.conversation_started, tenant_id, {"step": "onboarding_started"}, db)
        return {"status": "success", "message": "Onboarding started", "tenant_id": str(new_tenant.id)}

    async def submit_kyc(self, tenant_id: UUID, kyc_data: Dict[str, Any], db: AsyncSession) -> Dict[str, Any]:
        # Check if KYC already exists for this tenant
        result = await db.execute(select(KYCInfo).where(KYCInfo.tenant_id == tenant_id))
        kyc_info = result.scalar_one_or_none()
        if kyc_info:
            # Update existing KYC
            kyc_info.business_name = kyc_data["business_name"]
            kyc_info.id_number = kyc_data["id_number"]
            kyc_info.id_type = kyc_data["id_type"]
            kyc_info.status = KYCStatusEnum.pending
        else:
            kyc_info = KYCInfo(
                tenant_id=tenant_id,
                business_name=kyc_data["business_name"],
                id_number=kyc_data["id_number"],
                id_type=kyc_data["id_type"],
                status=KYCStatusEnum.pending,
            )
            db.add(kyc_info)
        await db.commit()
        await db.refresh(kyc_info)
        await log_conversation_event_to_db(ConversationEventType.message_sent, tenant_id, {"step": "kyc_submitted"}, db)
        return {"status": "success", "message": "KYC submitted", "kyc_id": str(kyc_info.id)}

    async def set_domain(self, tenant_id: UUID, domain: str, db: AsyncSession) -> Dict[str, Any]:
        # Check for domain conflict
        result = await db.execute(select(Tenant).where(Tenant.subdomain == domain))
        existing = result.scalar_one_or_none()
        if existing:
            raise DomainConflictError("Domain is already taken.")
        # Set domain for tenant
        tenant = await db.get(Tenant, tenant_id)
        if not tenant:
            raise OnboardingError("Tenant not found.")
        tenant.subdomain = domain
        await db.commit()
        await db.refresh(tenant)
        await log_conversation_event_to_db(ConversationEventType.message_sent, tenant_id, {"step": "domain_set", "domain": domain}, db)
        return {"status": "success", "message": f"Domain {domain} set", "domain": domain}

    async def invite_team_member(self, tenant_id: UUID, invite_data: Dict[str, Any], db: AsyncSession) -> Dict[str, Any]:
        invite = TeamInvite(
            tenant_id=tenant_id,
            invitee_phone=invite_data.get("invitee_phone"),
            invitee_email=invite_data.get("invitee_email"),
            role=invite_data.get("role"),
            status=TeamInviteStatusEnum.pending,
        )
        db.add(invite)
        await db.commit()
        await db.refresh(invite)
        invite_link = f"https://wa.me/{invite.invitee_phone}?text=Join+my+team" if invite.invitee_phone else None
        # Send WhatsApp (SMS) invite if phone is provided
        notification_service = NotificationService()
        if invite.invitee_phone:
            notification = Notification(
                id=str(invite.id),
                tenant_id=str(tenant_id),
                user_id="",  # Not known at invite time
                title="Team Invitation",
                message=f"You have been invited to join a store team. Click to join: {invite_link}",
                priority=NotificationPriority.MEDIUM,
                channels=[NotificationChannel.SMS],
                metadata={"invite_id": str(
                    invite.id), "invite_link": invite_link},
            )
            await notification_service.send_notification(notification)
        # Send email invite if email is provided
        if invite.invitee_email:
            notification = Notification(
                id=str(invite.id),
                tenant_id=str(tenant_id),
                user_id="",  # Not known at invite time
                title="Team Invitation",
                message=f"You have been invited to join a store team. Click to join: {invite_link}",
                priority=NotificationPriority.MEDIUM,
                channels=[NotificationChannel.EMAIL],
                metadata={"invite_id": str(
                    invite.id), "invite_link": invite_link},
            )
            await notification_service.send_notification(notification)
        # Audit log
        await log_conversation_event_to_db(
            ConversationEventType.user_joined,
            tenant_id,
            {"step": "team_invited", "invitee": invite.invitee_phone or invite.invitee_email,
                "invite_id": str(invite.id)},
            db,
        )
        return {"status": "success", "invite_link": invite_link, "invite_id": str(invite.id)}

    async def upload_kyc_document(self, tenant_id: UUID, kyc_id: UUID, file_data: Any, db: AsyncSession) -> Dict[str, Any]:
        # Upload file to Cloudinary
        upload_result = await CloudinaryClient.upload_file(file_data, folder=f"kyc/{tenant_id}")
        file_url = upload_result.get("secure_url")
        # Store file_url in KYCDocument table
        kyc_doc = KYCDocument(
            kyc_info_id=kyc_id,
            file_url=file_url,
            file_type=file_data.content_type,
            status=KYCDocumentStatusEnum.uploaded,
        )
        db.add(kyc_doc)
        await db.commit()
        await db.refresh(kyc_doc)
        await log_conversation_event_to_db(ConversationEventType.message_sent, tenant_id, {"step": "kyc_doc_uploaded", "file_url": file_url}, db)
        return {"status": "success", "message": "KYC document uploaded", "file_url": file_url, "doc_id": str(kyc_doc.id)}

    async def get_onboarding_status(self, tenant_id: UUID, db: AsyncSession) -> dict:
        # Check business info (tenant exists)
        tenant = await db.get(Tenant, tenant_id)
        business_info_complete = bool(
            tenant and tenant.name and tenant.subdomain and tenant.whatsapp_number)
        # Check KYC
        kyc_info = None
        result = await db.execute(select(KYCInfo).where(KYCInfo.tenant_id == tenant_id))
        kyc_info = result.scalar_one_or_none()
        kyc_complete = bool(kyc_info and kyc_info.status in [
                            KYCStatusEnum.verified, KYCStatusEnum.pending])
        # Check KYC upload
        kyc_upload_complete = False
        if kyc_info:
            doc_result = await db.execute(select(KYCDocument).where(KYCDocument.kyc_info_id == kyc_info.id))
            kyc_doc = doc_result.scalar_one_or_none()
            kyc_upload_complete = bool(
                kyc_doc and kyc_doc.status == KYCDocumentStatusEnum.uploaded)
        # Check domain
        domain_complete = bool(tenant and tenant.subdomain)
        # Check team invite
        invite_result = await db.execute(select(TeamInvite).where(TeamInvite.tenant_id == tenant_id))
        invite = invite_result.scalar_one_or_none()
        team_invite_complete = bool(invite)
        # Determine current step
        steps = [
            ("business_info", business_info_complete),
            ("kyc", kyc_complete),
            ("kyc_upload", kyc_upload_complete),
            ("domain", domain_complete),
            ("team_invite", team_invite_complete),
        ]
        current_step = next(
            (name for name, complete in steps if not complete), None)
        overall_complete = all(complete for _, complete in steps)
        return OnboardingStatusResponse(
            business_info_complete=business_info_complete,
            kyc_complete=kyc_complete,
            kyc_upload_complete=kyc_upload_complete,
            domain_complete=domain_complete,
            team_invite_complete=team_invite_complete,
            overall_complete=overall_complete,
            current_step=current_step,
            message=(
                "Onboarding complete" if overall_complete else f"Next step: {current_step.replace('_', ' ').title()}" if current_step else None)
        ).dict()

    async def review_kyc(self, kyc_id: UUID, action: str, db: AsyncSession) -> dict:
        # Fetch KYC info
        kyc_info = await db.get(KYCInfo, kyc_id)
        if not kyc_info:
            raise OnboardingError("KYC record not found.")
        if action == "approve":
            kyc_info.status = KYCStatusEnum.verified
        elif action == "reject":
            kyc_info.status = KYCStatusEnum.rejected
        else:
            raise OnboardingError(
                "Invalid action. Must be 'approve' or 'reject'.")
        await db.commit()
        await db.refresh(kyc_info)
        await log_conversation_event_to_db(
            ConversationEventType.message_sent,
            kyc_info.tenant_id,
            {"step": "kyc_reviewed", "kyc_id": str(kyc_id), "action": action},
            db,
        )
        # Return updated KYCResponse
        return KYCInfoResponse.model_validate(kyc_info).dict()
