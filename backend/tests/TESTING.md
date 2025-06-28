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

## 3. Best Practices
- Always test with multiple users and tenants.
- Use both manual and automated tests to cover edge cases.
- Ensure all endpoints return correct status codes and error messages.
- Review logs for unauthorized access attempts.