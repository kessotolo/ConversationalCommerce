# Merchant ID Generation Guide

## Overview

Merchant IDs in ConversationalCommerce are generated using a systematic approach that ensures uniqueness, readability, and scalability. This guide explains how merchant IDs are created and used throughout the platform.

## How Merchant IDs Are Created

### 1. UUID Generation
Every merchant gets a unique UUID (Universally Unique Identifier) when they sign up:

```python
import uuid

# Generate a new merchant UUID
merchant_uuid = uuid.uuid4()
# Example: 550e8400-e29b-41d4-a716-446655440000
```

### 2. Subdomain Generation
The subdomain is created using the first 6 characters of the UUID:

```python
# Extract first 6 characters for subdomain
subdomain = str(merchant_uuid)[:6]
# Example: "550e84" from 550e8400-e29b-41d4-a716-446655440000
```

### 3. Final URL Structure
The merchant's storefront URL becomes:
```
https://550e84.enwhe.io
```

## Current Implementation

### Backend Implementation

#### 1. Tenant Model
```python
# backend/app/models/tenant.py
class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    subdomain = Column(String(63), nullable=False, unique=True)
    custom_domain = Column(String(253), nullable=True, unique=True)
```

#### 2. Onboarding Service
```python
# backend/app/services/seller_onboarding_service.py
async def start_onboarding(self, tenant_id: UUID, merchant_data: Dict[str, Any], db: AsyncSession):
    new_tenant = Tenant(
        id=tenant_id,  # UUID is passed in
        name=merchant_data["business_name"],
        subdomain=merchant_data["subdomain"],  # First 6 chars of UUID
        whatsapp_number=merchant_data.get("phone"),
        is_active=False,
    )
```

#### 3. Test Examples
```python
# backend/app/services/tests/test_seller_onboarding_service.py
tenant_id = uuid4()
merchant_data = {
    "business_name": "Test Merchant",
    "subdomain": f"test{tenant_id.hex[:6]}",  # First 6 chars
    "phone": "+1234567890"
}
```

### Frontend Implementation

#### 1. URL Generation Helper
```typescript
// frontend/src/config.ts
export const getMerchantUrl = (merchantId: string, customDomain?: string): string => {
  if (customDomain) {
    return `https://${customDomain}`;
  }
  return `https://${merchantId}.${DOMAIN_CONFIG.BASE_DOMAIN}`;
};
```

#### 2. Usage Examples
```typescript
// Generate merchant URL
const merchantUrl = getMerchantUrl('550e84'); // https://550e84.enwhe.io

// With custom domain
const customUrl = getMerchantUrl('550e84', 'shop.mystore.com'); // https://shop.mystore.com
```

## Merchant Onboarding Flow

### 1. Registration Process
```python
# 1. Generate UUID
merchant_uuid = uuid.uuid4()

# 2. Create subdomain from first 6 characters
subdomain = str(merchant_uuid)[:6]

# 3. Create tenant record
tenant = Tenant(
    id=merchant_uuid,
    name="My Store",
    subdomain=subdomain,
    phone_number="+254700123456"
)

# 4. Generate URLs
storefront_url = f"https://{subdomain}.enwhe.io"
whatsapp_url = f"https://wa.me/254700123456?text=Hi%20I%20want%20to%20buy"
```

### 2. Example Merchant Creation
```python
# Input: Merchant signs up with "ABC Electronics"
merchant_uuid = uuid.uuid4()  # 550e8400-e29b-41d4-a716-446655440000
subdomain = "550e84"  # First 6 characters

# Results in:
storefront_url = "https://550e84.enwhe.io"
whatsapp_number = "+254700123456"
whatsapp_url = "https://wa.me/254700123456?text=Hi%20I%20want%20to%20buy%20product%20ABC123"
```

## URL Structure Examples

### Merchant Storefronts
```
https://550e84.enwhe.io  # ABC Electronics
https://a1b2c3.enwhe.io  # XYZ Store
https://def456.enwhe.io  # Fashion Boutique
```

### Custom Domains (Optional)
```
https://shop.abcelectronics.com  # Custom domain
https://store.xyz.com            # Another custom domain
```

### WhatsApp Integration
```
https://wa.me/254700123456?text=Hi%20I%20want%20to%20buy%20product%20ABC123
```

## Validation and Constraints

### 1. Subdomain Validation
```python
# backend/app/utils/domain_validator.py
def validate_subdomain(subdomain: str) -> Tuple[bool, Optional[str]]:
    # Check length (1-63 characters)
    if not subdomain or len(subdomain) > 63:
        return False, "Subdomain must be between 1 and 63 characters"

    # Check if reserved
    if subdomain.lower() in RESERVED_SUBDOMAINS:
        return False, f"Subdomain '{subdomain}' is reserved"

    # Check pattern (alphanumeric + hyphens)
    if not SUBDOMAIN_PATTERN.match(subdomain.lower()):
        return False, "Subdomain can only contain lowercase letters, numbers, and hyphens"

    return True, None
```

### 2. Reserved Subdomains
```python
RESERVED_SUBDOMAINS = [
    "www", "api", "admin", "app", "auth", "billing", "blog",
    "dashboard", "docs", "help", "mail", "support", "store",
    "static", "media", "assets", "images", "files", "cdn",
    "internal", "system", "dev", "stage", "test", "production"
]
```

### 3. Uniqueness Check
```python
# Check if subdomain already exists
existing_tenant = db.query(Tenant).filter(Tenant.subdomain == subdomain).first()
if existing_tenant:
    raise DomainConflictError("Subdomain is already taken.")
```

## Collision Handling

### 1. UUID Collision Probability
- UUID v4 has 2^122 possible values
- Collision probability is extremely low (practically zero)
- First 6 characters provide 16^6 = 16,777,216 unique combinations

### 2. Subdomain Collision Detection
```python
# If collision occurs, append additional characters
if collision_detected:
    subdomain = f"{base_subdomain}{uuid.uuid4().hex[:2]}"
    # Example: "550e84" becomes "550e84a1"
```

### 3. Fallback Strategy
```python
# If UUID-based subdomain fails, use business name
if not is_valid_subdomain(uuid_subdomain):
    business_name_subdomain = slugify(business_name)
    subdomain = f"{business_name_subdomain}-{uuid.uuid4().hex[:4]}"
```

## WhatsApp Number Assignment

### 1. Number Generation
```python
# Each merchant gets a unique WhatsApp number
whatsapp_number = f"+2547{random.randint(10000000, 99999999)}"
# Example: +254700123456
```

### 2. Number Validation
```python
# Validate phone number format
def validate_phone_number(phone: str) -> bool:
    # Check country code (+254 for Kenya)
    # Check length (10-15 digits)
    # Check format (no spaces, proper country code)
    pass
```

### 3. Number Uniqueness
```python
# Ensure WhatsApp number is unique
existing_tenant = db.query(Tenant).filter(Tenant.whatsapp_number == whatsapp_number).first()
if existing_tenant:
    # Generate new number
    whatsapp_number = generate_unique_whatsapp_number()
```

## API Endpoints

### 1. Create Merchant
```bash
POST /api/v1/onboarding/start
{
  "business_name": "ABC Electronics",
  "phone": "+254700123456",
  "email": "contact@abcelectronics.com"
}

Response:
{
  "status": "success",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "subdomain": "550e84",
  "storefront_url": "https://550e84.enwhe.io",
  "whatsapp_url": "https://wa.me/254700123456"
}
```

### 2. Check Subdomain Availability
```bash
GET /api/v1/tenants/subdomain/{subdomain}/availability

Response:
{
  "available": true,
  "subdomain": "550e84"
}
```

### 3. Update Merchant Settings
```bash
PUT /api/v1/tenants/{tenant_id}/settings
{
  "custom_domain": "shop.abcelectronics.com",
  "whatsapp_number": "+254700123456"
}
```

## Database Schema

### Tenant Table
```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    subdomain VARCHAR(63) NOT NULL UNIQUE,
    custom_domain VARCHAR(253) UNIQUE,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    whatsapp_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    storefront_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Storefront Config Table
```sql
CREATE TABLE storefront_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    subdomain_name VARCHAR(63) NOT NULL UNIQUE,
    custom_domain VARCHAR(253) UNIQUE,
    theme_settings JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Best Practices

### 1. Merchant ID Generation
- ✅ Use UUID v4 for uniqueness
- ✅ Extract first 6 characters for subdomain
- ✅ Validate subdomain format
- ✅ Check for reserved subdomains
- ✅ Ensure uniqueness in database

### 2. WhatsApp Number Assignment
- ✅ Use country-specific format (+254 for Kenya)
- ✅ Ensure number uniqueness
- ✅ Validate phone number format
- ✅ Provide fallback for collisions

### 3. URL Generation
- ✅ Use consistent format: `merchant-id.enwhe.io`
- ✅ Support custom domains
- ✅ Generate WhatsApp deep links
- ✅ Provide QR codes for easy sharing

### 4. Error Handling
- ✅ Handle subdomain collisions
- ✅ Validate input data
- ✅ Provide meaningful error messages
- ✅ Log all merchant creation events

## Migration Considerations

### 1. Existing Merchants
If migrating from a different system:
```sql
-- Update existing merchants with new subdomain format
UPDATE tenants
SET subdomain = CONCAT(LEFT(id::text, 6), '.enwhe.io')
WHERE subdomain IS NULL OR subdomain = '';
```

### 2. Data Migration
```python
# Migrate existing merchant data
for tenant in existing_tenants:
    if not tenant.subdomain:
        tenant.subdomain = str(tenant.id)[:6]
        tenant.whatsapp_number = generate_whatsapp_number()
```

## Monitoring and Analytics

### 1. Merchant Creation Metrics
```python
# Track merchant creation events
await log_conversation_event_to_db(
    ConversationEventType.conversation_started,
    tenant_id,
    {
        "step": "onboarding_started",
        "subdomain": subdomain,
        "business_name": business_name
    },
    db
)
```

### 2. Subdomain Usage Analytics
```sql
-- Track subdomain usage
SELECT
    subdomain,
    COUNT(*) as usage_count,
    created_at
FROM tenants
GROUP BY subdomain, created_at
ORDER BY created_at DESC;
```

This merchant ID generation system provides a scalable, unique, and user-friendly approach to identifying merchants in the ConversationalCommerce platform.