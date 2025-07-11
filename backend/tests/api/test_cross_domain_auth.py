"""
Tests for cross-domain authentication between main app and admin dashboard.

This module provides test cases to validate that authentication works correctly
across different domains (main app and admin dashboard).
"""

import pytest
from fastapi import status

from app.core.config.settings import get_settings


def test_admin_cors_headers(client):
    """Test that admin API routes respond with correct CORS headers."""
    # Arrange
    settings = get_settings()
    admin_domain = "admin.yourplatform.com"
    headers = {
        "Origin": f"https://{admin_domain}",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type,Authorization"
    }

    # Act - Preflight request to admin login endpoint
    response = client.options(
        "/api/admin/auth/login",
        headers=headers
    )

    # Assert
    assert response.status_code == status.HTTP_200_OK
    assert "access-control-allow-origin" in response.headers
    assert response.headers["access-control-allow-origin"] == f"https://{admin_domain}"
    assert "access-control-allow-credentials" in response.headers
    assert response.headers["access-control-allow-credentials"] == "true"
    assert "access-control-allow-methods" in response.headers
    assert "POST" in response.headers["access-control-allow-methods"]


def test_admin_login_from_admin_domain(
    client,
    test_admin_user: dict,
    test_db
):
    """Test admin login from admin domain."""
    # Arrange
    admin_domain = "admin.yourplatform.com"
    login_data = {
        "email": test_admin_user["email"],
        "password": "testpassword123"
    }
    headers = {"Origin": f"https://{admin_domain}"}

    # Act
    response = client.post(
        "/api/admin/auth/login",
        json=login_data,
        headers=headers
    )

    # Assert
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert "token_type" in data
    assert data["token_type"] == "bearer"


def test_admin_login_from_main_domain_blocked(
    client,
    test_admin_user: dict,
    test_db
):
    """Test that admin login from main domain is blocked."""
    # Arrange
    main_domain = "app.yourplatform.com"
    login_data = {
        "email": test_admin_user["email"],
        "password": "testpassword123"
    }
    headers = {"Origin": f"https://{main_domain}"}

    # Act
    response = client.post(
        "/api/admin/auth/login",
        json=login_data,
        headers=headers
    )

    # Assert - Should be forbidden due to CORS restrictions
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_tenant_api_from_tenant_subdomain(
    client,
    test_tenant: dict,
    test_db
):
    """Test tenant API access from tenant subdomain."""
    # Arrange
    subdomain = test_tenant["subdomain"]
    tenant_domain = f"{subdomain}.yourplatform.com"
    headers = {
        "Origin": f"https://{tenant_domain}",
        "Host": tenant_domain
    }

    # Act
    response = client.get(
        "/api/tenant/resolve",
        params={"hostname": tenant_domain},
        headers=headers
    )

    # Assert
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["subdomain"] == subdomain


def test_admin_token_audience_validation(
    client,
    super_admin_token: str
):
    """Test that admin tokens have correct audience claims."""
    # Arrange
    admin_domain = "admin.yourplatform.com"
    headers = {
        "Authorization": f"Bearer {super_admin_token}",
        "Origin": f"https://{admin_domain}"
    }

    # Act - Access admin-only endpoint
    response = client.get(
        "/api/admin/auth/me",
        headers=headers
    )

    # Assert
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "permissions" in data
    assert "roles" in data


def test_admin_token_rejected_for_main_app(
    client,
    super_admin_token: str
):
    """Test that admin tokens are rejected for main app endpoints."""
    # Arrange
    main_domain = "app.yourplatform.com"
    headers = {
        "Authorization": f"Bearer {super_admin_token}",
        "Origin": f"https://{main_domain}"
    }

    # Act - Try to access main app endpoint with admin token
    response = client.get(
        "/api/users/me",  # Main app user endpoint
        headers=headers
    )

    # Assert - Should be unauthorized due to audience mismatch
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_main_app_token_rejected_for_admin(
    client,
    user_token: str
):
    """Test that main app tokens are rejected for admin endpoints."""
    # Arrange
    admin_domain = "admin.yourplatform.com"
    headers = {
        "Authorization": f"Bearer {user_token}",
        "Origin": f"https://{admin_domain}"
    }

    # Act - Try to access admin endpoint with main app token
    response = client.get(
        "/api/admin/auth/me",
        headers=headers
    )

    # Assert - Should be unauthorized due to audience mismatch
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
