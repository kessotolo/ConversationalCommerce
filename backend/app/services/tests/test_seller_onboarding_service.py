import pytest
import asyncio
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.services.seller_onboarding_service import SellerOnboardingService, DomainConflictError
from backend.app.models.tenant import Tenant


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

# TODO: Add tests for event logging and tenant isolation
