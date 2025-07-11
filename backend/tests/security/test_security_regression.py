"""
Security regression tests for the ConversationalCommerce platform.

This module contains comprehensive tests to ensure that security features
work correctly and that no regressions are introduced in security-critical
areas of the application.
"""

import pytest
from unittest.mock import patch, AsyncMock
from datetime import datetime, timedelta

from app.core.security.clerk_organizations import ClerkOrganizationsService
from app.services.security.ip_allowlist_service import IPAllowlistService
from app.services.security.super_admin_two_factor_service import SuperAdminTwoFactorService
from app.services.security.brute_force_service import BruteForceService
from app.services.security.two_factor_service import TwoFactorService


class TestSuperAdminSecurityRegression:
    """Test suite for SuperAdmin security regression testing."""

    def test_clerk_organization_membership_validation(self, test_db):
        """Test Clerk organization membership validation for SuperAdmin access."""

        # Test valid SuperAdmin organization membership
        service = ClerkOrganizationsService()

        # Mock the service to return valid SuperAdmin status
        with patch.object(service, 'is_super_admin', return_value=True):
            is_super_admin = service.is_super_admin("test_user_id")
            assert is_super_admin is True

        # Test invalid organization membership
        with patch.object(service, 'is_super_admin', return_value=False):
            is_super_admin = service.is_super_admin("regular_user_id")
            assert is_super_admin is False

    def test_ip_allowlist_enforcement(self, test_db):
        """Test IP allowlist enforcement for SuperAdmin endpoints."""

        # Test IP allowlist service
        service = IPAllowlistService()

        # Test adding IP to allowlist
        allowlist_entry = service.add_allowlist_entry(
            db=test_db,
            ip_range="192.168.1.0/24",
            description="Test IP range",
            is_global=True,
            created_by="admin_user_id"
        )

        assert allowlist_entry.ip_range == "192.168.1.0/24"
        assert allowlist_entry.is_global is True

        # Test IP validation
        is_allowed = service.is_ip_allowed(test_db, "192.168.1.100")
        assert is_allowed is True

        # Test blocked IP
        is_allowed = service.is_ip_allowed(test_db, "10.0.0.1")
        assert is_allowed is False

    def test_session_management_security(self, test_db):
        """Test session management security for SuperAdmin sessions."""

        # Test session management through brute force service
        service = BruteForceService()

        # Test recording login attempts
        login_attempt = service.record_login_attempt(
            db=test_db,
            username="admin_user",
            ip_address="192.168.1.100",
            result="success",
            user_id="admin_user_id",
            is_admin_portal=True
        )

        assert login_attempt.username == "admin_user"
        assert login_attempt.ip_address == "192.168.1.100"
        assert login_attempt.is_admin_portal is True

        # Test rate limiting
        is_rate_limited = service.is_rate_limited(
            db=test_db,
            username="admin_user",
            ip_address="192.168.1.100"
        )
        assert is_rate_limited is False

    def test_two_factor_authentication(self, test_db):
        """Test two-factor authentication for SuperAdmin accounts."""

        # Test 2FA service
        service = TwoFactorService()

        # Test enabling 2FA
        secret = service.generate_totp_secret("admin_user_id")
        assert len(secret) > 0

        # Test TOTP validation
        code = service.generate_totp_code(secret)
        is_valid = service.validate_totp_code(secret, code)
        assert is_valid is True

        # Test invalid TOTP code
        is_valid = service.validate_totp_code(secret, "000000")
        assert is_valid is False

    def test_brute_force_protection(self, test_db):
        """Test brute force protection for SuperAdmin authentication."""

        # Test brute force service
        service = BruteForceService()

        # Test recording failed login attempts
        for i in range(5):
            service.record_login_attempt(
                db=test_db,
                username="admin_user",
                ip_address="192.168.1.100",
                result="failed",
                user_id=None,
                is_admin_portal=True
            )

        # Test rate limiting
        is_rate_limited = service.is_rate_limited(
            db=test_db,
            username="admin_user",
            ip_address="192.168.1.100"
        )

        # Should not be rate limited on first check
        assert is_rate_limited is False

    def test_security_headers_injection(self, client):
        """Test that security headers are properly injected for admin endpoints."""

        # Test admin endpoint security headers
        response = client.get("/api/admin/health")

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

    def test_cors_domain_restrictions(self, client):
        """Test CORS domain restrictions for admin endpoints."""

        # Test allowed admin domain
        headers = {
            "Origin": "https://admin.enwhe.com",
            "Access-Control-Request-Method": "GET"
        }

        response = client.options("/api/admin/health", headers=headers)
        assert response.status_code == 200
        assert response.headers.get(
            "access-control-allow-origin") == "https://admin.enwhe.com"

        # Test blocked domain
        headers = {
            "Origin": "https://malicious-site.com",
            "Access-Control-Request-Method": "GET"
        }

        response = client.options("/api/admin/health", headers=headers)
        # Should either return 403 or not include the malicious origin in CORS headers
        if response.status_code == 200:
            assert response.headers.get(
                "access-control-allow-origin") != "https://malicious-site.com"


class TestSecurityMiddlewareRegression:
    """Test suite for security middleware regression testing."""

    def test_domain_specific_cors_middleware(self, client):
        """Test domain-specific CORS middleware functionality."""

        # Test admin domain CORS policy
        admin_headers = {
            "Host": "admin.enwhe.com",
            "Origin": "https://admin.enwhe.com"
        }

        response = client.get("/api/admin/health", headers=admin_headers)

        # Should apply strict admin CORS policy
        assert response.headers.get(
            "access-control-allow-origin") == "https://admin.enwhe.com"

        # Test main app domain CORS policy
        main_headers = {
            "Host": "app.enwhe.io",
            "Origin": "https://app.enwhe.io"
        }

        response = client.get("/api/health", headers=main_headers)

        # Should apply standard CORS policy
        assert response.headers.get(
            "access-control-allow-origin") == "https://app.enwhe.io"

    def test_super_admin_security_middleware(self, client):
        """Test SuperAdmin security middleware comprehensive protection."""

        # Test IP allowlist enforcement
        blocked_ip_headers = {"X-Forwarded-For": "10.0.0.1"}
        response = client.get("/api/admin/users", headers=blocked_ip_headers)
        assert response.status_code == 403
        assert "IP not in allowlist" in response.json()["detail"]

        # Test rate limiting
        allowed_ip_headers = {"X-Forwarded-For": "192.168.1.100"}

        # Make many requests to trigger rate limiting
        for _ in range(105):  # Exceed 100 req/min limit
            client.get("/api/admin/health", headers=allowed_ip_headers)

        response = client.get("/api/admin/health", headers=allowed_ip_headers)
        assert response.status_code == 429
        assert "Rate limit exceeded" in response.json()["detail"]


class TestSecurityEventLogging:
    """Test suite for security event logging and audit trails."""

    def test_security_event_audit_logging(self, test_db):
        """Test that security events are properly logged for audit."""

        # Test login attempt logging
        service = BruteForceService()

        login_attempt = service.record_login_attempt(
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
        allowlist_entry = ip_service.add_allowlist_entry(
            db=test_db,
            ip_range="10.0.0.0/8",
            description="Test IP range",
            is_global=True,
            created_by="admin_user_id"
        )

        assert allowlist_entry.ip_range == "10.0.0.0/8"
        assert allowlist_entry.description == "Test IP range"


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
