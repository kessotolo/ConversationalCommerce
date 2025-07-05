# Backend API Testing Guide

This document provides a basis for all backend API testing, including manual and automated (pytest) steps. Use this as a template for testing any feature (address book, profile, orders, payments, etc.).

---

## 1. General Testing Principles
- All requests must be authenticated as the correct user (buyer, seller, or admin as appropriate).
- The backend should infer user and tenant context from the session/JWT; do not pass user/customer_id directly.
- Always test with multiple users and tenants to ensure isolation.
- Use both manual and automated tests to cover edge and error cases.
- Ensure all endpoints return correct status codes and error messages.
- Review logs for unauthorized access attempts.

---

## 2. Feature Testing Templates

### **A. Address Book**

#### Manual Testing Steps
1. **List Addresses**
   - `GET /api/v1/address-book/`
   - Should return only addresses for the authenticated buyer and tenant.
2. **Add Address**
   - `POST /api/v1/address-book/` with address data in JSON body.
   - Should create a new address for the current buyer/tenant.
3. **Edit Address**
   - `PUT /api/v1/address-book/{address_id}` or `PATCH /api/v1/address-book/{address_id}`
   - Should update only the specified address if it belongs to the current buyer/tenant.
4. **Delete Address**
   - `DELETE /api/v1/address-book/{address_id}`
   - Should delete only the specified address if it belongs to the current buyer/tenant.
5. **Set Default Address**
   - `PATCH /api/v1/address-book/{address_id}/default`
   - Should mark the specified address as default and unset previous default.

#### Tenant Isolation
- Log in as Buyer A (Tenant 1) and Buyer B (Tenant 2).
- Ensure Buyer A cannot access, edit, or delete Buyer B's addresses (should return 404 or 403).

#### Error Cases
- Try to access or modify an address that does not exist or does not belong to the buyer/tenant.
- Should return 404 Not Found or 403 Forbidden.
- Try unauthenticated requests; should return 401 Unauthorized.

#### Automated Testing (Pytest Example)
```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
def test_address_book_crud(authenticated_client, test_address_data):
    # List addresses (should be empty)
    resp = await authenticated_client.get("/api/v1/address-book/")
    assert resp.status_code == 200
    assert resp.json() == []

    # Add address
    resp = await authenticated_client.post("/api/v1/address-book/", json=test_address_data)
    assert resp.status_code == 201
    address = resp.json()
    address_id = address["id"]

    # Get address
    resp = await authenticated_client.get(f"/api/v1/address-book/{address_id}")
    assert resp.status_code == 200
    assert resp.json()["street"] == test_address_data["street"]

    # Update address
    resp = await authenticated_client.patch(f"/api/v1/address-book/{address_id}", json={"city": "New City"})
    assert resp.status_code == 200
    assert resp.json()["city"] == "New City"

    # Set as default
    resp = await authenticated_client.patch(f"/api/v1/address-book/{address_id}/default")
    assert resp.status_code == 200
    assert resp.json()["is_default"] is True

    # Delete address
    resp = await authenticated_client.delete(f"/api/v1/address-book/{address_id}")
    assert resp.status_code == 204

@pytest.mark.asyncio
def test_tenant_isolation(client_tenant1, client_tenant2, test_address_data):
    # Buyer 1 adds address
    resp = await client_tenant1.post("/api/v1/address-book/", json=test_address_data)
    address_id = resp.json()["id"]
    # Buyer 2 tries to access Buyer 1's address
    resp = await client_tenant2.get(f"/api/v1/address-book/{address_id}")
    assert resp.status_code in (403, 404)
```

---

### **B. Profile Management**
*(Add manual and automated test steps for profile endpoints here)*

---

### **C. Orders**
*(Add manual and automated test steps for order endpoints here)*

---

### **D. Payments**
*(Add manual and automated test steps for payment endpoints here)*

---

### **E. Onboarding & KYC Review**

#### Manual Testing Steps
1. **Seller Onboarding Flow**
   - Complete onboarding as a seller (business info, KYC, KYC upload, domain, team invite).
   - Verify onboarding status updates at each step.
   - Test error cases (e.g., domain taken, missing fields, KYC rejected).
   - Confirm analytics/events are logged for each step and error.
2. **Admin KYC Review**
   - As an admin, visit `/admin/monitoring`.
   - Approve and reject KYC requests; verify status updates and UI feedback.
   - Confirm backend status changes and event logging.

#### Automated Testing (Pytest Example)
```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
def test_onboarding_flow(authenticated_client, test_seller_data):
    # Start onboarding
    resp = await authenticated_client.post("/api/v1/onboarding/start", json=test_seller_data)
    assert resp.status_code == 200
    # Submit KYC
    # ... (repeat for each step)

@pytest.mark.asyncio
def test_kyc_review(admin_client, kyc_id):
    # Approve KYC
    resp = await admin_client.post("/api/v1/onboarding/kyc/review", json={"kyc_id": kyc_id, "action": "approve"})
    assert resp.status_code == 200
    # Reject KYC
    resp = await admin_client.post("/api/v1/onboarding/kyc/review", json={"kyc_id": kyc_id, "action": "reject"})
    assert resp.status_code == 200
```

---

## Phase 2A: Admin Security Testing

### **F. Global IP Allowlisting**

#### Manual Testing Steps
1. **IP Allowlist Management**
   - `GET /api/admin/ip-allowlist/` - List all IP allowlist entries
   - `POST /api/admin/ip-allowlist/` - Create new IP allowlist entry
   - `PUT /api/admin/ip-allowlist/{entry_id}` - Update existing entry
   - `DELETE /api/admin/ip-allowlist/{entry_id}` - Delete entry

2. **IP Allowlist Enforcement**
   - Access admin endpoints from allowed IP address - should succeed
   - Access admin endpoints from non-allowed IP address - should return 403
   - Test with CIDR ranges (e.g., `192.168.1.0/24`)
   - Test with individual IP addresses

3. **Global vs User-Specific Allowlists**
   - Test global allowlist entries affect all admin users
   - Test user-specific allowlist entries only affect specific users
   - Test role-based allowlist entries affect users with specific roles

#### Automated Testing (Pytest Example)
```python
import pytest
from httpx import AsyncClient
from unittest.mock import patch

@pytest.mark.asyncio
async def test_ip_allowlist_enforcement(admin_client):
    # Test allowed IP
    with patch('app.core.http.get_client_ip', return_value='192.168.1.100'):
        resp = await admin_client.get("/api/admin/users/")
        assert resp.status_code == 200

    # Test blocked IP
    with patch('app.core.http.get_client_ip', return_value='10.0.0.1'):
        resp = await admin_client.get("/api/admin/users/")
        assert resp.status_code == 403
        assert "IP address not allowed" in resp.json()["detail"]

@pytest.mark.asyncio
async def test_ip_allowlist_management(super_admin_client):
    # Create IP allowlist entry
    entry_data = {
        "ip_address": "192.168.1.0/24",
        "description": "Office network",
        "is_active": True
    }
    resp = await super_admin_client.post("/api/admin/ip-allowlist/", json=entry_data)
    assert resp.status_code == 201
    entry_id = resp.json()["id"]

    # List entries
    resp = await super_admin_client.get("/api/admin/ip-allowlist/")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1

    # Update entry
    resp = await super_admin_client.put(f"/api/admin/ip-allowlist/{entry_id}",
                                       json={**entry_data, "description": "Updated office network"})
    assert resp.status_code == 200
    assert resp.json()["description"] == "Updated office network"

    # Delete entry
    resp = await super_admin_client.delete(f"/api/admin/ip-allowlist/{entry_id}")
    assert resp.status_code == 204
```

### **G. Security Headers**

#### Manual Testing Steps
1. **Header Verification**
   - Make any admin API request and verify response headers include:
     - `Strict-Transport-Security`
     - `Content-Security-Policy`
     - `X-Frame-Options`
     - `X-Content-Type-Options`
     - `Referrer-Policy`
     - `Permissions-Policy`

2. **Browser Security Testing**
   - Test CSP prevents inline scripts and styles
   - Test X-Frame-Options prevents embedding in iframes
   - Test HSTS forces HTTPS connections

#### Automated Testing (Pytest Example)
```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_security_headers(admin_client):
    resp = await admin_client.get("/api/admin/users/")

    # Verify all security headers are present
    expected_headers = [
        "strict-transport-security",
        "content-security-policy",
        "x-frame-options",
        "x-content-type-options",
        "referrer-policy",
        "permissions-policy"
    ]

    for header in expected_headers:
        assert header in resp.headers, f"Missing security header: {header}"

    # Verify specific header values
    assert resp.headers["x-frame-options"] == "DENY"
    assert resp.headers["x-content-type-options"] == "nosniff"
    assert "max-age=" in resp.headers["strict-transport-security"]

@pytest.mark.asyncio
async def test_csp_header_content(admin_client):
    resp = await admin_client.get("/api/admin/users/")
    csp = resp.headers.get("content-security-policy", "")

    # Verify CSP includes expected directives
    assert "default-src 'self'" in csp
    assert "script-src 'self'" in csp
    assert "style-src 'self'" in csp
    assert "img-src 'self'" in csp
```

### **H. Staff Role Enforcement**

#### Manual Testing Steps
1. **Staff Role Requirement**
   - Create admin user without staff role - should fail to access admin endpoints
   - Create admin user with staff role - should succeed in accessing admin endpoints
   - Remove staff role from existing admin user - should immediately lose access

2. **Role-Based Access Control**
   - Test different admin roles (Super Admin, System Admin, Support Admin)
   - Verify each role has appropriate permissions
   - Test role inheritance and permission scoping

#### Automated Testing (Pytest Example)
```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_staff_role_enforcement(client, test_admin_user):
    # Test admin user without staff role
    non_staff_token = create_jwt_token(test_admin_user, roles=[])
    headers = {"Authorization": f"Bearer {non_staff_token}"}

    resp = await client.get("/api/admin/users/", headers=headers)
    assert resp.status_code == 403
    assert "Staff role required" in resp.json()["detail"]

    # Test admin user with staff role
    staff_token = create_jwt_token(test_admin_user, roles=["staff"])
    headers = {"Authorization": f"Bearer {staff_token}"}

    resp = await client.get("/api/admin/users/", headers=headers)
    assert resp.status_code == 200

@pytest.mark.asyncio
async def test_role_hierarchy(super_admin_client, system_admin_client, support_admin_client):
    # Super admin should access everything
    resp = await super_admin_client.get("/api/admin/system/settings/")
    assert resp.status_code == 200

    # System admin should access most things
    resp = await system_admin_client.get("/api/admin/users/")
    assert resp.status_code == 200

    # Support admin should have limited access
    resp = await support_admin_client.get("/api/admin/system/settings/")
    assert resp.status_code == 403
```

### **I. CORS Restrictions**

#### Manual Testing Steps
1. **Admin Domain Restriction**
   - Make admin API requests from `https://admin.enwhe.io` - should succeed
   - Make admin API requests from other domains - should fail with CORS error
   - Test preflight OPTIONS requests for CORS compliance

2. **Tenant Domain Separation**
   - Verify tenant APIs have separate CORS policies
   - Test that admin APIs cannot be accessed from tenant domains
   - Test that tenant APIs cannot be accessed from admin domain

#### Automated Testing (Pytest Example)
```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_cors_admin_domain_restriction(client):
    # Test allowed origin
    headers = {
        "Origin": "https://admin.enwhe.io",
        "Authorization": f"Bearer {admin_token}"
    }
    resp = await client.get("/api/admin/users/", headers=headers)
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == "https://admin.enwhe.io"

    # Test blocked origin
    headers = {
        "Origin": "https://malicious-site.com",
        "Authorization": f"Bearer {admin_token}"
    }
    resp = await client.get("/api/admin/users/", headers=headers)
    # Should either block or not include CORS headers
    assert "access-control-allow-origin" not in resp.headers or \
           resp.headers["access-control-allow-origin"] != "https://malicious-site.com"

@pytest.mark.asyncio
async def test_cors_preflight_requests(client):
    # Test preflight request
    headers = {
        "Origin": "https://admin.enwhe.io",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Authorization, Content-Type"
    }
    resp = await client.options("/api/admin/users/", headers=headers)
    assert resp.status_code == 200
    assert "access-control-allow-methods" in resp.headers
    assert "access-control-allow-headers" in resp.headers
```

### **J. Integration Security Testing**

#### Manual Testing Steps
1. **End-to-End Security Flow**
   - Test complete admin login flow with all security layers
   - Verify IP allowlist, staff role, and CORS work together
   - Test security header application throughout user journey

2. **Security Bypass Attempts**
   - Attempt to bypass IP allowlist using proxy/VPN
   - Attempt to bypass staff role using token manipulation
   - Attempt to bypass CORS using various techniques

#### Automated Testing (Pytest Example)
```python
import pytest
from httpx import AsyncClient
from unittest.mock import patch

@pytest.mark.asyncio
async def test_complete_security_flow(client):
    # Test with all security layers active
    with patch('app.core.http.get_client_ip', return_value='192.168.1.100'):
        # Create staff user token
        staff_token = create_jwt_token(staff_user, roles=["staff"])
        headers = {
            "Authorization": f"Bearer {staff_token}",
            "Origin": "https://admin.enwhe.io"
        }

        resp = await client.get("/api/admin/users/", headers=headers)
        assert resp.status_code == 200

        # Verify all security headers are present
        assert "strict-transport-security" in resp.headers
        assert "content-security-policy" in resp.headers
        assert resp.headers["access-control-allow-origin"] == "https://admin.enwhe.io"

@pytest.mark.asyncio
async def test_security_failure_scenarios(client):
    # Test blocked IP + valid staff role
    with patch('app.core.http.get_client_ip', return_value='10.0.0.1'):
        staff_token = create_jwt_token(staff_user, roles=["staff"])
        headers = {"Authorization": f"Bearer {staff_token}"}

        resp = await client.get("/api/admin/users/", headers=headers)
        assert resp.status_code == 403
        assert "IP address not allowed" in resp.json()["detail"]

    # Test allowed IP + invalid role
    with patch('app.core.http.get_client_ip', return_value='192.168.1.100'):
        non_staff_token = create_jwt_token(regular_user, roles=[])
        headers = {"Authorization": f"Bearer {non_staff_token}"}

        resp = await client.get("/api/admin/users/", headers=headers)
        assert resp.status_code == 403
        assert "Staff role required" in resp.json()["detail"]
```

---

## 4. Security Testing Best Practices
- Always test with multiple IP addresses and network configurations
- Test all admin endpoints with different role combinations
- Verify security headers are applied consistently across all responses
- Test CORS policies with various origins and request methods
- Use automated tests to catch security regressions
- Regularly review and update IP allowlist entries
- Monitor security logs for unauthorized access attempts
- Test security features work correctly in production environment

---

## 3. Best Practices
- Always test with multiple users and tenants.
- Use both manual and automated tests to cover edge cases.
- Ensure all endpoints return correct status codes and error messages.
- Review logs for unauthorized access attempts.