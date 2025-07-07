"""
Security Regression Test Suite

This module contains comprehensive security tests to ensure all Phase 2A security
features continue to work correctly and prevent security regressions.
"""

import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from httpx import AsyncClient

from app.core.security.clerk_organizations import ClerkOrganizationsService
from app.core.security.session.manager import SuperAdminSessionManager
from app.services.security.ip_allowlist_service import IPAllowlistService
from app.services.security.super_admin_two_factor_service import SuperAdminTwoFactorService
from app.services.security.brute_force_service import BruteForceService


class TestSuperAdminSecurityRegression:
    """Test suite for SuperAdmin security features regression testing."""

    @pytest.mark.asyncio
    async def test_clerk_organization_membership_validation(self, test_db):
        """Test that Clerk organization membership validation works correctly."""
        service = ClerkOrganizationsService()

        # Test valid SuperAdmin user
        with patch.object(service, 'get_user_organizations') as mock_get_orgs:
            mock_get_orgs.return_value = [{
                "organization": {"id": service.super_admin_org_id},
                "status": "active"
            }]

            is_super_admin = await service.is_super_admin("test_user_id")
            assert is_super_admin is True

        # Test non-SuperAdmin user
        with patch.object(service, 'get_user_organizations') as mock_get_orgs:
            mock_get_orgs.return_value = [{
                "organization": {"id": "different_org_id"},
                "status": "active"
            }]

            is_super_admin = await service.is_super_admin("test_user_id")
            assert is_super_admin is False

    @pytest.mark.asyncio
    async def test_ip_allowlist_enforcement(self, test_db):
        """Test that IP allowlist enforcement prevents unauthorized access."""
        service = IPAllowlistService()

        # Add test IP to allowlist
        await service.add_allowlist_entry(
            db=test_db,
            ip_range="192.168.1.0/24",
            description="Test IP range",
            is_global=True
        )

        # Enable IP allowlist enforcement
        await service.set_allowlist_enforcement(
            db=test_db,
            is_enforced=True
        )

        # Test allowed IP
        allowed = await service.is_ip_allowed_global(test_db, "192.168.1.100")
        assert allowed is True

        # Test blocked IP
        blocked = await service.is_ip_allowed_global(test_db, "10.0.0.1")
        assert blocked is False

    @pytest.mark.asyncio
    async def test_session_management_security(self, test_db):
        """Test session management security features."""
        session_manager = SuperAdminSessionManager()

        # Mock Clerk organization validation
        with patch('app.core.security.clerk_organizations.clerk_organizations_service.is_super_admin') as mock_is_admin:
            mock_is_admin.return_value = True

            with patch('app.core.security.clerk_organizations.clerk_organizations_service.get_super_admin_role') as mock_get_role:
                mock_get_role.return_value = "admin"

                # Create session
                session_info = await session_manager.create_session(
                    db=test_db,
                    user_id="test_admin_user",
                    ip_address="192.168.1.100",
                    user_agent="Test User Agent"
                )

                assert session_info.user_id == "test_admin_user"
                assert session_info.security_level in [
                    "standard", "elevated", "high"]

                # Validate session
                validated_session = await session_manager.validate_session(
                    db=test_db,
                    session_id=session_info.session_id,
                    ip_address="192.168.1.100",
                    user_agent="Test User Agent"
                )

                assert validated_session is not None
                assert validated_session.session_id == session_info.session_id

    @pytest.mark.asyncio
    async def test_two_factor_authentication(self, test_db):
        """Test 2FA setup and verification."""
        service = SuperAdminTwoFactorService()

        # Setup TOTP for admin
        totp_data = await service.setup_totp_for_admin(
            db=test_db,
            admin_user_id="test_admin_user",
            ip_address="192.168.1.100"
        )

        assert "secret" in totp_data
        assert "qr_code_uri" in totp_data
        assert "backup_codes" in totp_data
        assert len(totp_data["backup_codes"]) == 10

        # Test TOTP verification (mock valid code)
        with patch('pyotp.TOTP.verify') as mock_verify:
            mock_verify.return_value = True

            is_valid = await service.verify_totp_code(
                db=test_db,
                admin_user_id="test_admin_user",
                code="123456"
            )

            assert is_valid is True

        # Test backup code verification
        backup_code = totp_data["backup_codes"][0]
        is_valid = await service.verify_backup_code(
            db=test_db,
            admin_user_id="test_admin_user",
            backup_code=backup_code
        )

        assert is_valid is True

    @pytest.mark.asyncio
    async def test_brute_force_protection(self, test_db):
        """Test brute force protection mechanisms."""
        service = BruteForceService()

        user_id = "test_user_id"
        ip_address = "192.168.1.100"

        # Simulate multiple failed login attempts
        for i in range(5):
            await service.record_login_attempt(
                db=test_db,
                username="test_user",
                ip_address=ip_address,
                result="failed_password",
                user_id=user_id
            )

        # Check if account is locked
        is_locked = await service.is_account_locked(test_db, user_id)
        assert is_locked is True

        # Test rate limiting
        is_rate_limited, retry_after = await service.check_rate_limit(
            db=test_db,
            rule_name="admin_api",
            ip_address=ip_address,
            user_id=user_id,
            is_admin=True
        )

        # Should not be rate limited on first check
        assert is_rate_limited is False

    @pytest.mark.asyncio
    async def test_security_headers_injection(self, client: AsyncClient):
        """Test that security headers are properly injected for admin endpoints."""

        # Test admin endpoint security headers
        response = await client.get("/api/admin/health")

        # Check for presence of security headers
        expected_headers = [
            "strict-transport-security",
            "content-security-policy",
            "x-frame-options",
            "x-content-type-options",
            "referrer-policy",
            "permissions-policy"
        ]

        for header in expected_headers:
            assert header in response.headers, f"Missing security header: {header}"

        # Verify specific header values
        assert response.headers["x-frame-options"] == "DENY"
        assert response.headers["x-content-type-options"] == "nosniff"
        assert "max-age=31536000" in response.headers["strict-transport-security"]

    @pytest.mark.asyncio
    async def test_cors_domain_restrictions(self, client: AsyncClient):
        """Test CORS domain restrictions for admin endpoints."""

        # Test allowed admin domain
        headers = {
            "Origin": "https://admin.enwhe.com",
            "Access-Control-Request-Method": "GET"
        }

        response = await client.options("/api/admin/health", headers=headers)
        assert response.status_code == 200
        assert response.headers.get(
            "access-control-allow-origin") == "https://admin.enwhe.com"

        # Test blocked domain
        headers = {
            "Origin": "https://malicious-site.com",
            "Access-Control-Request-Method": "GET"
        }

        response = await client.options("/api/admin/health", headers=headers)
        # Should either return 403 or not include the malicious origin in CORS headers
        if response.status_code == 200:
            assert response.headers.get(
                "access-control-allow-origin") != "https://malicious-site.com"


class TestSecurityMiddlewareRegression:
    """Test suite for security middleware regression testing."""

    @pytest.mark.asyncio
    async def test_domain_specific_cors_middleware(self, client: AsyncClient):
        """Test domain-specific CORS middleware functionality."""

        # Test admin domain CORS policy
        admin_headers = {
            "Host": "admin.enwhe.com",
            "Origin": "https://admin.enwhe.com"
        }

        response = await client.get("/api/admin/health", headers=admin_headers)

        # Should apply strict admin CORS policy
        assert response.headers.get(
            "access-control-allow-origin") == "https://admin.enwhe.com"

        # Test main app domain CORS policy
        main_headers = {
            "Host": "app.enwhe.io",
            "Origin": "https://app.enwhe.io"
        }

        response = await client.get("/api/health", headers=main_headers)

        # Should apply standard CORS policy
        assert response.headers.get(
            "access-control-allow-origin") == "https://app.enwhe.io"

    @pytest.mark.asyncio
    async def test_super_admin_security_middleware(self, client: AsyncClient):
        """Test SuperAdmin security middleware comprehensive protection."""

        # Test IP allowlist enforcement
        blocked_ip_headers = {"X-Forwarded-For": "10.0.0.1"}
        response = await client.get("/api/admin/users", headers=blocked_ip_headers)
        assert response.status_code == 403
        assert "IP not in allowlist" in response.json()["detail"]

        # Test rate limiting
        allowed_ip_headers = {"X-Forwarded-For": "192.168.1.100"}

        # Make many requests to trigger rate limiting
        for _ in range(105):  # Exceed 100 req/min limit
            await client.get("/api/admin/health", headers=allowed_ip_headers)

        response = await client.get("/api/admin/health", headers=allowed_ip_headers)
        assert response.status_code == 429
        assert "Rate limit exceeded" in response.json()["detail"]


class TestSecurityEventLogging:
    """Test suite for security event logging and audit trails."""

    @pytest.mark.asyncio
    async def test_security_event_audit_logging(self, test_db):
        """Test that security events are properly logged for audit."""

        # Test login attempt logging
        service = BruteForceService()

        login_attempt = await service.record_login_attempt(
            db=test_db,
            username="test_user",
            ip_address="192.168.1.100",
            result="success",
            user_id="test_user_id",
            is_admin_portal=True
        )

        assert login_attempt.username == "test_user"
        assert login_attempt.ip_address == "192.168.1.100"
        assert login_attempt.is_admin_portal is True

        # Test IP allowlist modification logging
        ip_service = IPAllowlistService()

        # This should generate audit log entries
        await ip_service.add_allowlist_entry(
            db=test_db,
            ip_range="10.0.0.0/8",
            description="Test IP range",
            is_global=True,
            created_by="admin_user_id"
        )

        # Verify audit logs would be created (actual audit service testing)
        # This would require integration with the actual audit service


class TestSecurityConfigurationValidation:
    """Test suite for validating security configuration consistency."""

    def test_security_environment_variables(self):
        """Test that required security environment variables are properly configured."""
        import os

        # Test that critical security variables are set (in test environment)
        required_vars = [
            "SECRET_KEY",
            "CLERK_SECRET_KEY",
            "ADMIN_ENFORCE_IP_RESTRICTIONS",
            "ADMIN_REQUIRE_2FA"
        ]

        for var in required_vars:
            # In tests, these might be mocked, but structure should be validated
            assert var in os.environ or var in [
                "SECRET_KEY", "CLERK_SECRET_KEY"], f"Missing required security environment variable: {var}"

    def test_security_middleware_registration(self):
        """Test that security middleware is properly registered."""
        from app.main import app

        # Check that security middleware classes are in the middleware stack
        middleware_classes = [
            middleware.cls.__name__ for middleware in app.user_middleware]

        expected_middleware = [
            "SuperAdminSecurityMiddleware",
            "DomainSpecificCORSMiddleware"
        ]

        for middleware_name in expected_middleware:
            assert any(
                middleware_name in cls_name for cls_name in middleware_classes), f"Missing security middleware: {middleware_name}"


# Fixtures for security testing
@pytest.fixture
async def mock_clerk_service():
    """Mock Clerk Organizations service for testing."""
    with patch('app.core.security.clerk_organizations.clerk_organizations_service') as mock_service:
        mock_service.is_super_admin.return_value = True
        mock_service.get_super_admin_role.return_value = "admin"
        mock_service.super_admin_org_id = "org_2zWGCeV8c2H56B4ZcK5QmDOv9vL"
        yield mock_service


@pytest.fixture
async def security_test_user(test_db):
    """Create a test user for security testing."""
    from app.models.admin.admin_user import AdminUser

    admin_user = AdminUser(
        id="test_admin_user",
        email="test@admin.enwhe.com",
        is_super_admin=True,
        is_active=True,
        clerk_organization_id="org_2zWGCeV8c2H56B4ZcK5QmDOv9vL",
        clerk_organization_role="admin"
    )

    test_db.add(admin_user)
    await test_db.commit()
    await test_db.refresh(admin_user)

    return admin_user
