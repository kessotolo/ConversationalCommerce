import pytest
import asyncio
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.services.seller_onboarding_service import SellerOnboardingService, DomainConflictError
from backend.app.models.tenant import Tenant
from backend.app.models.kyc_info import KYCInfo
from backend.app.models.kyc_document import KYCDocument
from backend.app.models.team_invite import TeamInvite
from backend.app.models.conversation_event import ConversationEvent


@pytest.mark.asyncio
async def test_start_onboarding_happy_path(async_session: AsyncSession):
    service = SellerOnboardingService()
    tenant_id = uuid4()
    merchant_data = {
        "business_name": "Test Merchant",
        "subdomain": f"test{tenant_id.hex[:6]}",
        "phone": "+1234567890"
    }
    result = await service.start_onboarding(tenant_id, merchant_data, async_session)
    assert result["status"] == "success"
    tenant = await async_session.get(Tenant, tenant_id)
    assert tenant is not None
    assert tenant.name == merchant_data["business_name"]


@pytest.mark.asyncio
async def test_start_onboarding_domain_conflict(async_session: AsyncSession):
    service = SellerOnboardingService()
    tenant_id1 = uuid4()
    tenant_id2 = uuid4()
    subdomain = f"conflict{tenant_id1.hex[:6]}"
    merchant_data1 = {"business_name": "Merchant1",
                      "subdomain": subdomain, "phone": "+123"}
    merchant_data2 = {"business_name": "Merchant2",
                      "subdomain": subdomain, "phone": "+456"}
    await service.start_onboarding(tenant_id1, merchant_data1, async_session)
    with pytest.raises(DomainConflictError):
        await service.start_onboarding(tenant_id2, merchant_data2, async_session)


@pytest.mark.asyncio
async def test_submit_kyc_creates_and_updates(async_session: AsyncSession):
    service = SellerOnboardingService()
    tenant_id = uuid4()
    merchant_data = {"business_name": "Test Merchant",
                     "subdomain": f"kyc{tenant_id.hex[:6]}", "phone": "+123"}
    await service.start_onboarding(tenant_id, merchant_data, async_session)
    kyc_data = {"business_name": "Test Merchant",
                "id_number": "A1234567", "id_type": "passport"}
    result = await service.submit_kyc(tenant_id, kyc_data, async_session)
    assert result["status"] == "success"
    kyc = (await async_session.execute(
        KYCInfo.__table__.select().where(KYCInfo.tenant_id == tenant_id)
    )).first()
    assert kyc is not None
    # Update KYC
    kyc_data2 = {"business_name": "Test Merchant Updated",
                 "id_number": "B7654321", "id_type": "national"}
    result2 = await service.submit_kyc(tenant_id, kyc_data2, async_session)
    assert result2["status"] == "success"


@pytest.mark.asyncio
async def test_invite_team_member(async_session: AsyncSession):
    service = SellerOnboardingService()
    tenant_id = uuid4()
    merchant_data = {"business_name": "Team Merchant",
                     "subdomain": f"team{tenant_id.hex[:6]}", "phone": "+123"}
    await service.start_onboarding(tenant_id, merchant_data, async_session)
    invite_data = {"invitee_phone": "+2345678901", "role": "manager"}
    result = await service.invite_team_member(tenant_id, invite_data, async_session)
    assert result["status"] == "success"
    invites = (await async_session.execute(
        TeamInvite.__table__.select().where(TeamInvite.tenant_id == tenant_id)
    )).all()
    assert invites


@pytest.mark.asyncio
async def test_event_logging_on_onboarding(async_session: AsyncSession):
    service = SellerOnboardingService()
    tenant_id = uuid4()
    merchant_data = {"business_name": "Event Merchant",
                     "subdomain": f"event{tenant_id.hex[:6]}", "phone": "+123"}
    await service.start_onboarding(tenant_id, merchant_data, async_session)
    events = (await async_session.execute(
        ConversationEvent.__table__.select().where(
            ConversationEvent.tenant_id == tenant_id)
    )).all()
    assert events, "No ConversationEvent logged for onboarding"


@pytest.mark.asyncio
async def test_tenant_isolation(async_session: AsyncSession):
    service = SellerOnboardingService()
    tenant_id1 = uuid4()
    tenant_id2 = uuid4()
    merchant_data1 = {"business_name": "Tenant1",
                      "subdomain": f"iso{tenant_id1.hex[:6]}", "phone": "+123"}
    merchant_data2 = {"business_name": "Tenant2",
                      "subdomain": f"iso{tenant_id2.hex[:6]}", "phone": "+456"}
    await service.start_onboarding(tenant_id1, merchant_data1, async_session)
    await service.start_onboarding(tenant_id2, merchant_data2, async_session)
    # Add KYC for tenant 1 only
    kyc_data = {"business_name": "Tenant1",
                "id_number": "A123", "id_type": "passport"}
    await service.submit_kyc(tenant_id1, kyc_data, async_session)
    # Ensure tenant 2 has no KYC
    kyc2 = (await async_session.execute(
        KYCInfo.__table__.select().where(KYCInfo.tenant_id == tenant_id2)
    )).first()
    assert kyc2 is None, "Tenant isolation failed: tenant 2 should not see tenant 1's KYC"

# FUTURE: Add test for upload_kyc_document (mock CloudinaryClient.upload_file). See issue #125.
# FUTURE: Add tests for event logging and tenant isolation. See issue #126.
