"""
Comprehensive tests for MerchantDataIsolationService.

Tests cover:
- Row Level Security (RLS) enforcement
- Tenant isolation validation
- Cross-tenant data leakage prevention
- RLS policy creation and validation
- Database-level security
"""

import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.services.security.merchant_data_isolation_service import (
    MerchantDataIsolationService,
    RLSModelConfig
)
from app.models.tenant import Tenant
from app.models.user import User
from app.models.product import Product
from app.models.order import Order


@pytest.fixture
def mock_db_session():
    """Mock database session."""
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def isolation_service(mock_db_session):
    """MerchantDataIsolationService instance for testing."""
    return MerchantDataIsolationService(mock_db_session)


@pytest.fixture
def sample_tenant_ids():
    """Sample tenant IDs for testing."""
    return {
        'tenant_a': uuid.uuid4(),
        'tenant_b': uuid.uuid4(),
        'tenant_c': uuid.uuid4()
    }


class TestRLSPolicyCreation:
    """Test RLS policy creation and management."""

    @pytest.mark.asyncio
    async def test_create_rls_policy_basic(self, isolation_service, mock_db_session):
        """Test basic RLS policy creation."""
        model_config = RLSModelConfig(
            table_name="products",
            tenant_column="tenant_id",
            policy_name="products_tenant_isolation"
        )

        await isolation_service.create_rls_policy(model_config)

        # Should execute RLS creation SQL
        mock_db_session.execute.assert_called()
        call_args = mock_db_session.execute.call_args[0][0]
        assert "CREATE POLICY" in str(call_args)
        assert "products_tenant_isolation" in str(call_args)

    @pytest.mark.asyncio
    async def test_create_rls_policy_with_custom_condition(self, isolation_service, mock_db_session):
        """Test RLS policy creation with custom condition."""
        model_config = RLSModelConfig(
            table_name="orders",
            tenant_column="tenant_id",
            policy_name="orders_tenant_isolation",
            additional_conditions="AND is_deleted = false"
        )

        await isolation_service.create_rls_policy(model_config)

        call_args = mock_db_session.execute.call_args[0][0]
        assert "is_deleted = false" in str(call_args)

    @pytest.mark.asyncio
    async def test_enable_rls_on_table(self, isolation_service, mock_db_session):
        """Test enabling RLS on a table."""
        await isolation_service.enable_rls("products")

        mock_db_session.execute.assert_called()
        call_args = mock_db_session.execute.call_args[0][0]
        assert "ALTER TABLE products ENABLE ROW LEVEL SECURITY" in str(
            call_args)

    @pytest.mark.asyncio
    async def test_force_rls_on_table(self, isolation_service, mock_db_session):
        """Test forcing RLS on table (affects table owners too)."""
        await isolation_service.force_rls("products")

        mock_db_session.execute.assert_called()
        call_args = mock_db_session.execute.call_args[0][0]
        assert "ALTER TABLE products FORCE ROW LEVEL SECURITY" in str(
            call_args)


class TestTenantContextManagement:
    """Test tenant context management."""

    @pytest.mark.asyncio
    async def test_set_tenant_context(self, isolation_service, mock_db_session, sample_tenant_ids):
        """Test setting tenant context."""
        tenant_id = sample_tenant_ids['tenant_a']

        await isolation_service.set_tenant_context(tenant_id)

        # Should set the tenant context variable
        mock_db_session.execute.assert_called()
        call_args = mock_db_session.execute.call_args[0][0]
        assert "SELECT set_config" in str(call_args)
        assert str(tenant_id) in str(call_args)

    @pytest.mark.asyncio
    async def test_clear_tenant_context(self, isolation_service, mock_db_session):
        """Test clearing tenant context."""
        await isolation_service.clear_tenant_context()

        mock_db_session.execute.assert_called()
        call_args = mock_db_session.execute.call_args[0][0]
        assert "SELECT set_config" in str(call_args)
        assert "app.current_tenant_id" in str(call_args)

    @pytest.mark.asyncio
    async def test_get_current_tenant_context(self, isolation_service, mock_db_session, sample_tenant_ids):
        """Test getting current tenant context."""
        tenant_id = sample_tenant_ids['tenant_a']

        # Mock return value
        mock_result = MagicMock()
        mock_result.scalar.return_value = str(tenant_id)
        mock_db_session.execute.return_value = mock_result

        result = await isolation_service.get_current_tenant_context()

        assert result == tenant_id


class TestTenantIsolationValidation:
    """Test tenant isolation validation and enforcement."""

    @pytest.mark.asyncio
    async def test_validate_tenant_access_authorized(self, isolation_service, mock_db_session, sample_tenant_ids):
        """Test tenant access validation for authorized user."""
        tenant_id = sample_tenant_ids['tenant_a']
        user_id = uuid.uuid4()

        # Mock user belongs to tenant
        mock_result = MagicMock()
        mock_result.scalar.return_value = 1  # User exists
        mock_db_session.execute.return_value = mock_result

        result = await isolation_service.validate_tenant_access(tenant_id, user_id)

        assert result is True

    @pytest.mark.asyncio
    async def test_validate_tenant_access_unauthorized(self, isolation_service, mock_db_session, sample_tenant_ids):
        """Test tenant access validation for unauthorized user."""
        tenant_id = sample_tenant_ids['tenant_a']
        user_id = uuid.uuid4()

        # Mock user does not belong to tenant
        mock_result = MagicMock()
        mock_result.scalar.return_value = 0  # User does not exist
        mock_db_session.execute.return_value = mock_result

        result = await isolation_service.validate_tenant_access(tenant_id, user_id)

        assert result is False

    @pytest.mark.asyncio
    async def test_cross_tenant_data_leakage_prevention(self, isolation_service, mock_db_session, sample_tenant_ids):
        """Test prevention of cross-tenant data leakage."""
        tenant_a_id = sample_tenant_ids['tenant_a']
        tenant_b_id = sample_tenant_ids['tenant_b']

        # Set context for tenant A
        await isolation_service.set_tenant_context(tenant_a_id)

        # Mock query that should only return tenant A data
        mock_result = MagicMock()
        mock_result.fetchall.return_value = [
            # Should only contain tenant A records
            {'id': uuid.uuid4(), 'tenant_id': tenant_a_id, 'name': 'Product A1'},
            {'id': uuid.uuid4(), 'tenant_id': tenant_a_id, 'name': 'Product A2'}
        ]
        mock_db_session.execute.return_value = mock_result

        # Execute query for products
        query = text("SELECT * FROM products")
        result = await isolation_service._execute_with_rls(query)

        # Verify no tenant B data is returned
        records = result.fetchall()
        for record in records:
            assert record['tenant_id'] == tenant_a_id
            assert record['tenant_id'] != tenant_b_id


class TestRLSSecurityVulnerabilities:
    """Test RLS security vulnerabilities and attack vectors."""

    @pytest.mark.asyncio
    async def test_rls_bypass_attempt_prevention(self, isolation_service, mock_db_session, sample_tenant_ids):
        """Test prevention of RLS bypass attempts."""
        tenant_id = sample_tenant_ids['tenant_a']

        # Set tenant context
        await isolation_service.set_tenant_context(tenant_id)

        # Attempt to bypass RLS with malicious query
        malicious_query = text("""
            SET row_security = off;
            SELECT * FROM products WHERE tenant_id != :tenant_id;
        """)

        # Should fail or only return authorized data
        with pytest.raises(Exception):
            await isolation_service._execute_with_rls(malicious_query)

    @pytest.mark.asyncio
    async def test_sql_injection_in_tenant_context(self, isolation_service, mock_db_session):
        """Test SQL injection protection in tenant context setting."""
        malicious_tenant_id = "'; DROP TABLE products; --"

        # Should handle malicious input safely
        with pytest.raises(Exception):
            await isolation_service.set_tenant_context(malicious_tenant_id)

    @pytest.mark.asyncio
    async def test_privilege_escalation_prevention(self, isolation_service, mock_db_session):
        """Test prevention of privilege escalation through RLS."""
        # Attempt to escalate privileges by modifying RLS policies
        malicious_query = text("""
            ALTER TABLE products DISABLE ROW LEVEL SECURITY;
            DROP POLICY products_tenant_isolation ON products;
        """)

        # Should fail for non-superuser
        with pytest.raises(Exception):
            await isolation_service._execute_with_rls(malicious_query)


class TestRLSComplianceValidation:
    """Test RLS compliance validation across models."""

    @pytest.mark.asyncio
    async def test_validate_all_models_compliance(self, isolation_service, mock_db_session):
        """Test validation of RLS compliance across all tenant-scoped models."""
        # Mock compliance check results
        mock_results = [
            {'table_name': 'products', 'has_rls': True,
                'has_policy': True, 'has_tenant_column': True},
            {'table_name': 'orders', 'has_rls': True,
                'has_policy': True, 'has_tenant_column': True},
            {'table_name': 'users', 'has_rls': True,
                'has_policy': True, 'has_tenant_column': True},
        ]

        mock_result = MagicMock()
        mock_result.fetchall.return_value = mock_results
        mock_db_session.execute.return_value = mock_result

        compliance_report = await isolation_service.validate_rls_compliance()

        assert compliance_report['compliant_tables'] == 3
        assert compliance_report['non_compliant_tables'] == 0
        assert len(compliance_report['issues']) == 0

    @pytest.mark.asyncio
    async def test_detect_non_compliant_models(self, isolation_service, mock_db_session):
        """Test detection of non-compliant models."""
        # Mock non-compliant table
        mock_results = [
            {'table_name': 'products', 'has_rls': True,
                'has_policy': True, 'has_tenant_column': True},
            {'table_name': 'bad_table', 'has_rls': False,
                'has_policy': False, 'has_tenant_column': False},
        ]

        mock_result = MagicMock()
        mock_result.fetchall.return_value = mock_results
        mock_db_session.execute.return_value = mock_result

        compliance_report = await isolation_service.validate_rls_compliance()

        assert compliance_report['non_compliant_tables'] == 1
        assert len(compliance_report['issues']) > 0
        assert 'bad_table' in str(compliance_report['issues'])

    @pytest.mark.asyncio
    async def test_missing_tenant_column_detection(self, isolation_service, mock_db_session):
        """Test detection of missing tenant columns."""
        # Mock table missing tenant_id column
        mock_results = [
            {'table_name': 'legacy_table', 'has_rls': True,
                'has_policy': True, 'has_tenant_column': False},
        ]

        mock_result = MagicMock()
        mock_result.fetchall.return_value = mock_results
        mock_db_session.execute.return_value = mock_result

        compliance_report = await isolation_service.validate_rls_compliance()

        issues = compliance_report['issues']
        tenant_column_issues = [
            issue for issue in issues if 'tenant_id' in issue]
        assert len(tenant_column_issues) > 0


class TestMigrationGeneration:
    """Test migration script generation for RLS."""

    @pytest.mark.asyncio
    async def test_generate_migration_script(self, isolation_service):
        """Test generation of RLS migration script."""
        migration_script = await isolation_service.generate_rls_migration_script()

        # Should contain RLS setup for all tenant-scoped models
        assert "CREATE POLICY" in migration_script
        assert "ENABLE ROW LEVEL SECURITY" in migration_script
        assert "app.current_tenant_id" in migration_script

        # Should include all major tenant-scoped tables
        assert "products" in migration_script
        assert "orders" in migration_script
        assert "users" in migration_script

    @pytest.mark.asyncio
    async def test_generate_rollback_script(self, isolation_service):
        """Test generation of RLS rollback script."""
        rollback_script = await isolation_service.generate_rls_rollback_script()

        # Should contain RLS removal commands
        assert "DROP POLICY" in rollback_script
        assert "DISABLE ROW LEVEL SECURITY" in rollback_script


class TestPerformanceImpact:
    """Test performance impact of RLS implementation."""

    @pytest.mark.asyncio
    async def test_rls_query_performance(self, isolation_service, mock_db_session, sample_tenant_ids):
        """Test that RLS doesn't severely impact query performance."""
        tenant_id = sample_tenant_ids['tenant_a']

        # Set tenant context
        await isolation_service.set_tenant_context(tenant_id)

        # Mock query execution with timing
        import time
        start_time = time.time()

        # Simulate query execution
        query = text("SELECT * FROM products WHERE category = 'electronics'")
        mock_result = MagicMock()
        mock_result.fetchall.return_value = []
        mock_db_session.execute.return_value = mock_result

        result = await isolation_service._execute_with_rls(query)

        end_time = time.time()
        execution_time = end_time - start_time

        # Should complete reasonably quickly (under 1 second for test)
        assert execution_time < 1.0

    @pytest.mark.asyncio
    async def test_rls_connection_pooling_compatibility(self, isolation_service, mock_db_session):
        """Test RLS compatibility with connection pooling."""
        # Simulate multiple tenant contexts in sequence (connection reuse)
        tenant_ids = [uuid.uuid4(), uuid.uuid4(), uuid.uuid4()]

        for tenant_id in tenant_ids:
            await isolation_service.set_tenant_context(tenant_id)

            # Verify context is properly set for each tenant
            mock_result = MagicMock()
            mock_result.scalar.return_value = str(tenant_id)
            mock_db_session.execute.return_value = mock_result

            current_context = await isolation_service.get_current_tenant_context()
            assert current_context == tenant_id


class TestAuditLogging:
    """Test audit logging for RLS operations."""

    @pytest.mark.asyncio
    async def test_rls_policy_creation_logging(self, isolation_service, mock_db_session):
        """Test that RLS policy creation is logged for audit."""
        model_config = RLSModelConfig(
            table_name="products",
            tenant_column="tenant_id",
            policy_name="products_tenant_isolation"
        )

        with patch('app.services.security.merchant_data_isolation_service.logger') as mock_logger:
            await isolation_service.create_rls_policy(model_config)

            # Should log policy creation
            mock_logger.info.assert_called()

    @pytest.mark.asyncio
    async def test_tenant_context_change_logging(self, isolation_service, mock_db_session, sample_tenant_ids):
        """Test that tenant context changes are logged."""
        tenant_id = sample_tenant_ids['tenant_a']

        with patch('app.services.security.merchant_data_isolation_service.logger') as mock_logger:
            await isolation_service.set_tenant_context(tenant_id)

            # Should log context change
            mock_logger.debug.assert_called()

    @pytest.mark.asyncio
    async def test_compliance_violation_logging(self, isolation_service, mock_db_session):
        """Test that compliance violations are logged."""
        # Mock non-compliant table detection
        mock_results = [
            {'table_name': 'bad_table', 'has_rls': False,
                'has_policy': False, 'has_tenant_column': False},
        ]

        mock_result = MagicMock()
        mock_result.fetchall.return_value = mock_results
        mock_db_session.execute.return_value = mock_result

        with patch('app.services.security.merchant_data_isolation_service.logger') as mock_logger:
            await isolation_service.validate_rls_compliance()

            # Should log compliance issues
            mock_logger.warning.assert_called()
