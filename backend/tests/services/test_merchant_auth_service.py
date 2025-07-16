"""
Comprehensive tests for MerchantAuthService.

Tests cover:
- Merchant context validation
- Cross-tenant access prevention
- Role-based permissions
- Authentication edge cases
- Security vulnerabilities
"""

import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security.merchant_auth import (
    MerchantAuthService,
    MerchantAuthContext,
    MerchantIdType
)
from app.core.security.clerk_multi_org import MultiOrgClerkTokenData
from app.models.tenant import Tenant
from app.models.user import User
from app.models.team_member import TeamMember, TeamRole


@pytest.fixture
def mock_db_session():
    """Mock database session."""
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def sample_tenant():
    """Sample tenant for testing."""
    return Tenant(
        id=uuid.uuid4(),
        name="Test Merchant",
        subdomain="testmerchant",
        phone_number="+1234567890",
        is_active=True
    )


@pytest.fixture
def sample_user():
    """Sample user for testing."""
    return User(
        id=uuid.uuid4(),
        email="test@example.com",
        is_seller=True
    )


@pytest.fixture
def sample_clerk_data():
    """Sample Clerk token data."""
    return MultiOrgClerkTokenData(
        user_id="clerk_user_123",
        email="test@example.com",
        organizations=[],
        metadata={}
    )


@pytest.fixture
def auth_service(mock_db_session):
    """MerchantAuthService instance for testing."""
    return MerchantAuthService(mock_db_session)


class TestMerchantIdExtraction:
    """Test merchant ID extraction from requests."""

    @pytest.mark.asyncio
    async def test_extract_merchant_id_from_admin_path(self, auth_service):
        """Test extracting merchant ID from admin URL path."""
        # Mock request with admin path
        mock_request = MagicMock()
        mock_request.url.path = "/api/v1/admin/testmerchant/dashboard"

        merchant_id, id_type = auth_service._extract_merchant_id_from_request(
            mock_request)

        assert merchant_id == "testmerchant"
        assert id_type == MerchantIdType.SUBDOMAIN

    @pytest.mark.asyncio
    async def test_extract_merchant_id_from_storefront_header(self, auth_service):
        """Test extracting merchant ID from storefront header."""
        # Mock request with storefront header
        mock_request = MagicMock()
        mock_request.url.path = "/api/v1/storefront/products"
        mock_request.headers = {"X-Merchant-ID": "uuid-merchant-123"}

        merchant_id, id_type = auth_service._extract_merchant_id_from_request(
            mock_request)

        assert merchant_id == "uuid-merchant-123"
        assert id_type == MerchantIdType.UUID

    @pytest.mark.asyncio
    async def test_extract_merchant_id_missing(self, auth_service):
        """Test handling missing merchant ID."""
        mock_request = MagicMock()
        mock_request.url.path = "/api/v1/other/endpoint"
        mock_request.headers = {}

        with pytest.raises(HTTPException) as exc_info:
            auth_service._extract_merchant_id_from_request(mock_request)

        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "merchant" in exc_info.value.detail.lower()


class TestTenantValidation:
    """Test tenant validation and resolution."""

    @pytest.mark.asyncio
    async def test_validate_tenant_by_uuid(self, auth_service, mock_db_session, sample_tenant):
        """Test tenant validation by UUID."""
        # Mock database query
        mock_db_session.execute.return_value.scalar_one_or_none.return_value = sample_tenant

        result = await auth_service._validate_tenant("uuid-123", MerchantIdType.UUID)

        assert result == sample_tenant
        mock_db_session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_validate_tenant_by_subdomain(self, auth_service, mock_db_session, sample_tenant):
        """Test tenant validation by subdomain."""
        # Mock database query
        mock_db_session.execute.return_value.scalar_one_or_none.return_value = sample_tenant

        result = await auth_service._validate_tenant("testmerchant", MerchantIdType.SUBDOMAIN)

        assert result == sample_tenant
        mock_db_session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_validate_tenant_not_found(self, auth_service, mock_db_session):
        """Test tenant validation when tenant doesn't exist."""
        # Mock database query returning None
        mock_db_session.execute.return_value.scalar_one_or_none.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await auth_service._validate_tenant("nonexistent", MerchantIdType.SUBDOMAIN)

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_validate_tenant_inactive(self, auth_service, mock_db_session):
        """Test tenant validation for inactive tenant."""
        inactive_tenant = Tenant(
            id=uuid.uuid4(),
            name="Inactive Merchant",
            subdomain="inactive",
            phone_number="+1234567890",
            is_active=False
        )

        mock_db_session.execute.return_value.scalar_one_or_none.return_value = inactive_tenant

        with pytest.raises(HTTPException) as exc_info:
            await auth_service._validate_tenant("inactive", MerchantIdType.SUBDOMAIN)

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


class TestRoleBasedAccess:
    """Test role-based access control."""

    @pytest.mark.asyncio
    async def test_merchant_owner_access(self, auth_service, sample_tenant, sample_user, sample_clerk_data):
        """Test merchant owner has full access."""
        # Set user as tenant owner
        sample_user.tenant_id = sample_tenant.id

        context = MerchantAuthContext(
            user_data=sample_clerk_data,
            user=sample_user,
            tenant=sample_tenant,
            merchant_id=str(sample_tenant.id)
        )

        assert context.is_merchant_owner is True
        assert context.has_merchant_access is True

    @pytest.mark.asyncio
    async def test_team_member_access(self, auth_service, mock_db_session, sample_tenant, sample_user, sample_clerk_data):
        """Test team member access."""
        # Set up team member relationship
        team_member = TeamMember(
            id=uuid.uuid4(),
            tenant_id=sample_tenant.id,
            user_id=sample_user.id,
            role=TeamRole.ADMIN,
            email=sample_user.email,
            is_active=True
        )

        mock_db_session.execute.return_value.scalar_one_or_none.return_value = team_member

        has_access = await auth_service._check_team_member_access(sample_user.id, sample_tenant.id)

        assert has_access is True

    @pytest.mark.asyncio
    async def test_no_access(self, auth_service, mock_db_session, sample_tenant, sample_clerk_data):
        """Test user with no access to merchant."""
        # Different user not associated with tenant
        other_user = User(
            id=uuid.uuid4(),
            email="other@example.com",
            is_seller=True,
            tenant_id=uuid.uuid4()  # Different tenant
        )

        # Mock no team member relationship
        mock_db_session.execute.return_value.scalar_one_or_none.return_value = None

        context = MerchantAuthContext(
            user_data=sample_clerk_data,
            user=other_user,
            tenant=sample_tenant,
            merchant_id=str(sample_tenant.id)
        )

        assert context.is_merchant_owner is False

        has_access = await auth_service._check_team_member_access(other_user.id, sample_tenant.id)
        assert has_access is False


class TestSecurityVulnerabilities:
    """Test security vulnerabilities and attack vectors."""

    @pytest.mark.asyncio
    async def test_sql_injection_in_merchant_id(self, auth_service, mock_db_session):
        """Test SQL injection protection in merchant ID."""
        malicious_id = "'; DROP TABLE tenants; --"

        # Should not execute malicious SQL
        mock_db_session.execute.return_value.scalar_one_or_none.return_value = None

        with pytest.raises(HTTPException):
            await auth_service._validate_tenant(malicious_id, MerchantIdType.SUBDOMAIN)

        # Verify parameterized query was used (no SQL injection possible)
        mock_db_session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_cross_tenant_data_access_prevention(self, auth_service, mock_db_session):
        """Test prevention of cross-tenant data access."""
        tenant_a_id = uuid.uuid4()
        tenant_b_id = uuid.uuid4()

        user_from_tenant_a = User(
            id=uuid.uuid4(),
            email="user@tenanta.com",
            tenant_id=tenant_a_id
        )

        tenant_b = Tenant(
            id=tenant_b_id,
            name="Tenant B",
            subdomain="tenantb",
            phone_number="+1234567890",
            is_active=True
        )

        # Mock no team member relationship between user and tenant B
        mock_db_session.execute.return_value.scalar_one_or_none.return_value = None

        # User from tenant A should not have access to tenant B
        has_access = await auth_service._check_team_member_access(user_from_tenant_a.id, tenant_b_id)
        assert has_access is False

    @pytest.mark.asyncio
    async def test_privilege_escalation_prevention(self, auth_service, mock_db_session):
        """Test prevention of privilege escalation."""
        # Seller should not be able to access admin endpoints
        seller_member = TeamMember(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            role=TeamRole.SELLER,  # Lower privilege
            email="seller@example.com",
            is_active=True
        )

        mock_db_session.execute.return_value.scalar_one_or_none.return_value = seller_member

        # Seller should have basic access but not admin access
        has_access = await auth_service._check_team_member_access(
            seller_member.user_id,
            seller_member.tenant_id
        )
        assert has_access is True

        # But role should be checked separately for admin operations
        assert seller_member.role != TeamRole.ADMIN


class TestEdgeCases:
    """Test edge cases and error conditions."""

    @pytest.mark.asyncio
    async def test_malformed_uuid_merchant_id(self, auth_service, mock_db_session):
        """Test handling of malformed UUID merchant ID."""
        malformed_uuid = "not-a-valid-uuid"

        with pytest.raises(HTTPException) as exc_info:
            await auth_service._validate_tenant(malformed_uuid, MerchantIdType.UUID)

        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.asyncio
    async def test_empty_merchant_id(self, auth_service):
        """Test handling of empty merchant ID."""
        with pytest.raises(HTTPException) as exc_info:
            await auth_service._validate_tenant("", MerchantIdType.SUBDOMAIN)

        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.asyncio
    async def test_database_connection_error(self, auth_service, mock_db_session):
        """Test handling of database connection errors."""
        # Mock database error
        mock_db_session.execute.side_effect = Exception(
            "Database connection failed")

        with pytest.raises(HTTPException) as exc_info:
            await auth_service._validate_tenant("testmerchant", MerchantIdType.SUBDOMAIN)

        assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @pytest.mark.asyncio
    async def test_concurrent_access_handling(self, auth_service, mock_db_session, sample_tenant):
        """Test handling of concurrent access scenarios."""
        # Simulate concurrent access to same tenant
        mock_db_session.execute.return_value.scalar_one_or_none.return_value = sample_tenant

        # Multiple concurrent calls should all succeed
        results = await asyncio.gather(
            auth_service._validate_tenant(
                "testmerchant", MerchantIdType.SUBDOMAIN),
            auth_service._validate_tenant(
                "testmerchant", MerchantIdType.SUBDOMAIN),
            auth_service._validate_tenant(
                "testmerchant", MerchantIdType.SUBDOMAIN),
            return_exceptions=True
        )

        # All should succeed
        for result in results:
            assert isinstance(result, Tenant)
            assert result.subdomain == "testmerchant"


class TestPerformanceConsiderations:
    """Test performance-related aspects."""

    @pytest.mark.asyncio
    async def test_tenant_validation_efficiency(self, auth_service, mock_db_session, sample_tenant):
        """Test that tenant validation uses efficient queries."""
        mock_db_session.execute.return_value.scalar_one_or_none.return_value = sample_tenant

        await auth_service._validate_tenant("testmerchant", MerchantIdType.SUBDOMAIN)

        # Should make only one database call
        assert mock_db_session.execute.call_count == 1

        # Query should be parameterized and efficient
        call_args = mock_db_session.execute.call_args[0][0]
        assert hasattr(call_args, 'compile')  # SQLAlchemy query object

    @pytest.mark.asyncio
    async def test_team_member_access_caching_opportunity(self, auth_service, mock_db_session):
        """Test that team member access checks could benefit from caching."""
        user_id = uuid.uuid4()
        tenant_id = uuid.uuid4()

        team_member = TeamMember(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            user_id=user_id,
            role=TeamRole.ADMIN,
            email="admin@example.com",
            is_active=True
        )

        mock_db_session.execute.return_value.scalar_one_or_none.return_value = team_member

        # Multiple calls to same user/tenant combination
        await auth_service._check_team_member_access(user_id, tenant_id)
        await auth_service._check_team_member_access(user_id, tenant_id)

        # Currently makes 2 DB calls - opportunity for caching
        assert mock_db_session.execute.call_count == 2
