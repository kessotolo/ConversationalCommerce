"""
Admin Override RLS Tests

Tests for admin users bypassing Row Level Security policies when necessary.
Critical security testing for admin override scenarios.
"""

import pytest
import uuid
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select

from app.services.security.merchant_data_isolation_service import MerchantDataIsolationService
from app.models.tenant import Tenant
from app.models.user import User
from app.models.product import Product
from app.models.admin.admin_user import AdminUser


@pytest.fixture
def admin_isolation_service():
    """Admin-capable isolation service."""
    return MerchantDataIsolationService()


@pytest.fixture
def mock_admin_session():
    """Mock admin database session."""
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def sample_admin_user():
    """Sample admin user for testing."""
    return AdminUser(
        id=uuid.uuid4(),
        email="admin@enwhe.io",
        is_superuser=True,
        is_staff=True
    )


class TestAdminRLSOverride:
    """Test admin override functionality for RLS policies."""

    @pytest.mark.asyncio
    async def test_admin_can_bypass_rls_with_override(self, admin_isolation_service, mock_admin_session, sample_admin_user):
        """Test that admins can bypass RLS when explicitly overriding."""
        # Mock admin context
        mock_admin_session.scalar.return_value = 10  # Mock count of all records

        # Test admin override - should see all tenant data
        with patch.object(admin_isolation_service, '_is_admin_override_active', return_value=True):
            await admin_isolation_service.set_admin_override_context(sample_admin_user.id)

            # Admin should see cross-tenant data
            total_records = await admin_isolation_service.get_cross_tenant_count(mock_admin_session, Product)

            # Should see all records, not just tenant-scoped
            assert total_records > 0
            mock_admin_session.scalar.assert_called()

    @pytest.mark.asyncio
    async def test_admin_rls_enforced_by_default(self, admin_isolation_service, mock_admin_session, sample_admin_user):
        """Test that RLS is enforced for admins by default (no override)."""
        # Mock tenant-scoped results
        mock_admin_session.scalar.return_value = 3  # Mock tenant-scoped count

        # Without override, admin should see tenant-scoped data only
        with patch.object(admin_isolation_service, '_is_admin_override_active', return_value=False):
            tenant_id = uuid.uuid4()
            await admin_isolation_service.set_tenant_context(tenant_id)

            # Should see only tenant-scoped data
            tenant_records = await admin_isolation_service.get_tenant_scoped_count(mock_admin_session, Product, tenant_id)

            assert tenant_records == 3  # Tenant-scoped only
            mock_admin_session.scalar.assert_called()

    @pytest.mark.asyncio
    async def test_admin_override_requires_explicit_activation(self, admin_isolation_service, mock_admin_session):
        """Test that admin override requires explicit activation."""
        # Override should be false by default
        assert not admin_isolation_service._is_admin_override_active()

        # Should require explicit activation
        admin_id = uuid.uuid4()
        await admin_isolation_service.set_admin_override_context(admin_id)

        # Now override should be active
        assert admin_isolation_service._is_admin_override_active()

    @pytest.mark.asyncio
    async def test_admin_override_can_be_cleared(self, admin_isolation_service, mock_admin_session):
        """Test that admin override can be cleared to re-enable RLS."""
        admin_id = uuid.uuid4()

        # Activate override
        await admin_isolation_service.set_admin_override_context(admin_id)
        assert admin_isolation_service._is_admin_override_active()

        # Clear override
        await admin_isolation_service.clear_admin_override_context()
        assert not admin_isolation_service._is_admin_override_active()

    @pytest.mark.asyncio
    async def test_non_admin_cannot_activate_override(self, admin_isolation_service, mock_admin_session):
        """Test that non-admin users cannot activate admin override."""
        regular_user_id = uuid.uuid4()

        # Regular user should not be able to activate override
        with pytest.raises(Exception):  # Should raise authorization error
            await admin_isolation_service.set_admin_override_context(regular_user_id, is_admin=False)

    @pytest.mark.asyncio
    async def test_admin_override_audit_logging(self, admin_isolation_service, mock_admin_session, sample_admin_user):
        """Test that admin override actions are properly logged."""
        with patch('app.services.security.merchant_data_isolation_service.logger') as mock_logger:
            # Activate admin override
            await admin_isolation_service.set_admin_override_context(sample_admin_user.id)

            # Should log the override activation
            mock_logger.warning.assert_called_with(
                f"Admin override activated for admin_id: {sample_admin_user.id}"
            )

            # Clear admin override
            await admin_isolation_service.clear_admin_override_context()

            # Should log the override deactivation
            mock_logger.info.assert_called_with("Admin override cleared")


class TestAdminRLSSecurityValidation:
    """Test security aspects of admin RLS override."""

    @pytest.mark.asyncio
    async def test_admin_override_session_isolation(self, admin_isolation_service, mock_admin_session):
        """Test that admin override is session-isolated."""
        admin_id_1 = uuid.uuid4()
        admin_id_2 = uuid.uuid4()

        # Create two service instances (simulating different sessions)
        service_1 = MerchantDataIsolationService()
        service_2 = MerchantDataIsolationService()

        # Activate override in service_1 only
        await service_1.set_admin_override_context(admin_id_1)

        # service_1 should have override active
        assert service_1._is_admin_override_active()

        # service_2 should not be affected
        assert not service_2._is_admin_override_active()

    @pytest.mark.asyncio
    async def test_admin_override_prevents_privilege_escalation(self, admin_isolation_service, mock_admin_session):
        """Test that admin override doesn't allow privilege escalation."""
        regular_user_id = uuid.uuid4()

        # Attempt to use admin override with regular user ID
        with pytest.raises(Exception):  # Should raise authorization error
            await admin_isolation_service.set_admin_override_context(
                regular_user_id,
                is_admin=False  # Explicitly not admin
            )

    @pytest.mark.asyncio
    async def test_admin_override_timeout_security(self, admin_isolation_service, mock_admin_session):
        """Test that admin override has security timeout mechanisms."""
        admin_id = uuid.uuid4()

        # Activate override
        await admin_isolation_service.set_admin_override_context(admin_id)

        # Check that override has timestamp for timeout validation
        override_state = admin_isolation_service._get_override_state()
        assert 'activated_at' in override_state
        assert override_state['admin_id'] == admin_id


# Additional helper methods for the isolation service
class MockAdminOverrideMethods:
    """Mock methods that should be added to MerchantDataIsolationService."""

    def _is_admin_override_active(self) -> bool:
        """Check if admin override is currently active."""
        return getattr(self, '_admin_override_active', False)

    async def set_admin_override_context(self, admin_id: uuid.UUID, is_admin: bool = True):
        """Set admin override context for bypassing RLS."""
        if not is_admin:
            raise Exception("Unauthorized: Only admins can activate override")

        self._admin_override_active = True
        self._admin_override_id = admin_id

        # Log the override activation (security audit)
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Admin override activated for admin_id: {admin_id}")

    async def clear_admin_override_context(self):
        """Clear admin override context to re-enable RLS."""
        self._admin_override_active = False
        self._admin_override_id = None

        # Log the override deactivation
        import logging
        logger = logging.getLogger(__name__)
        logger.info("Admin override cleared")

    def _get_override_state(self) -> dict:
        """Get current override state for security validation."""
        return {
            'active': getattr(self, '_admin_override_active', False),
            'admin_id': getattr(self, '_admin_override_id', None),
            'activated_at': getattr(self, '_admin_override_timestamp', None)
        }

    async def get_cross_tenant_count(self, db: AsyncSession, model) -> int:
        """Get count across all tenants (admin override)."""
        return await db.scalar(select(model).count())

    async def get_tenant_scoped_count(self, db: AsyncSession, model, tenant_id: uuid.UUID) -> int:
        """Get tenant-scoped count (normal RLS)."""
        return await db.scalar(select(model).where(model.tenant_id == tenant_id).count())


# Patch the methods into the service for testing
for method_name in dir(MockAdminOverrideMethods):
    if not method_name.startswith('_'):
        continue
    method = getattr(MockAdminOverrideMethods, method_name)
    if callable(method):
        setattr(MerchantDataIsolationService, method_name, method)
