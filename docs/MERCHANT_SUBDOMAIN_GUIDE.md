# Merchant Subdomain Guide

## Overview

ConversationalCommerce uses a merchant subdomain structure where each merchant gets their own subdomain on `enwhe.io`. This provides a clean, professional URL structure while maintaining the ability to use custom domains.

## Domain Structure

### Merchant Subdomains
- **Format**: `merchant-id.enwhe.io`
- **Example**: `abc123.enwhe.io`
- **Custom Domains**: Merchants can point their custom domains to their storefront

### Domain Hierarchy

```
enwhe.io (Base Domain)
├── merchant-id.enwhe.io (Merchant Storefronts)
├── app.enwhe.io (Main Application)
├── api.enwhe.io (API Endpoints)
└── admin.enwhe.com (Admin Dashboard)
```

## URL Examples

### Merchant Storefronts
- `https://abc123.enwhe.io` - Merchant storefront
- `https://shop.mystore.com` - Custom domain (optional)
- `https://def456.enwhe.io` - Another merchant

### Application Domains
- `https://app.enwhe.io` - Main application
- `https://admin.enwhe.com` - Admin dashboard
- `https://api.enwhe.io` - API endpoints

## Configuration

### Backend Configuration

The backend is configured to use `enwhe.io` as the base domain:

```python
# backend/app/core/config/settings.py
BASE_DOMAIN: str = "enwhe.io"  # Base domain for merchant subdomains
```

### Frontend Configuration

The frontend middleware handles subdomain routing:

```typescript
// frontend/middleware.ts
const baseDomain = process.env['NEXT_PUBLIC_BASE_DOMAIN'] || 'enwhe.io';
```

### Environment Variables

#### Backend (.env)
```bash
BASE_DOMAIN=enwhe.io
BACKEND_CORS_ORIGINS=https://enwhe.io,https://*.enwhe.io,https://admin.enwhe.com,https://app.enwhe.io
```

#### Frontend (.env)
```bash
NEXT_PUBLIC_BASE_DOMAIN=enwhe.io
NEXT_PUBLIC_ADMIN_DOMAIN=admin.enwhe.com
NEXT_PUBLIC_APP_DOMAIN=app.enwhe.io
NEXT_PUBLIC_API_DOMAIN=api.enwhe.io
```

## Merchant Onboarding Flow

### 1. Merchant Registration
When a merchant signs up:
1. Generate a unique merchant ID (UUID)
2. Create subdomain using merchant ID
3. Set up storefront configuration
4. Enable WhatsApp integration

### 2. Subdomain Assignment
```python
# Example: Merchant with ID abc123-def4-5678-9012-345678901234
subdomain = "abc123"  # First 6 characters of UUID
storefront_url = "https://abc123.enwhe.io"
```

### 3. Custom Domain Setup (Optional)
Merchants can point their custom domains:
1. Add custom domain in merchant settings
2. Provide DNS instructions
3. Verify domain ownership
4. Enable custom domain

## DNS Configuration

### Wildcard DNS Record
To support all merchant subdomains, add a wildcard DNS record:

```
Type: A
Name: *.enwhe.io
Value: [Your Server IP]
```

### Custom Domain DNS
For merchants using custom domains:

```
Type: CNAME
Name: shop
Value: abc123.enwhe.io
```

## Security Considerations

### Subdomain Isolation
- Each merchant subdomain is completely isolated
- Row-Level Security (RLS) ensures data separation
- No cross-tenant data access

### SSL Certificates
- Wildcard SSL certificate for `*.enwhe.io`
- Individual certificates for custom domains
- Automatic certificate provisioning

### CORS Configuration
```python
BACKEND_CORS_ORIGINS = [
    "https://enwhe.io",
    "https://*.enwhe.io",  # All merchant subdomains
    "https://admin.enwhe.com",
    "https://app.enwhe.io",
]
```

## Development Setup

### Local Development
For local development, use query parameters:

```bash
# Access merchant storefront locally
http://localhost:3000?subdomain=abc123

# Access admin dashboard locally
http://localhost:3001
```

### Environment Configuration
```bash
# Development
BASE_DOMAIN=localhost
NEXT_PUBLIC_BASE_DOMAIN=localhost

# Production
BASE_DOMAIN=enwhe.io
NEXT_PUBLIC_BASE_DOMAIN=enwhe.io
```

## Merchant URL Generation

### Helper Functions
```typescript
// frontend/src/config.ts
export const getMerchantUrl = (merchantId: string, customDomain?: string): string => {
  if (customDomain) {
    return `https://${customDomain}`;
  }
  return `https://${merchantId}.${DOMAIN_CONFIG.BASE_DOMAIN}`;
};
```

### Usage Examples
```typescript
// Generate merchant URL
const merchantUrl = getMerchantUrl('abc123'); // https://abc123.enwhe.io

// With custom domain
const customUrl = getMerchantUrl('abc123', 'shop.mystore.com'); // https://shop.mystore.com
```

## WhatsApp Integration

### Merchant-Specific WhatsApp Numbers
Each merchant gets their own WhatsApp number:
- **Format**: `+254700123456` (Kenya example)
- **Routing**: Messages are routed based on the receiving number
- **NLP**: Cart management works per merchant

### WhatsApp URL Structure
```
https://wa.me/254700123456?text=Hi%20I%20want%20to%20buy%20product%20ABC123
```

## Storefront Features

### Merchant Dashboard
- **URL**: `https://abc123.enwhe.io/dashboard`
- **Features**: Product management, orders, analytics
- **Access**: Merchant login required

### Customer Storefront
- **URL**: `https://abc123.enwhe.io`
- **Features**: Product browsing, cart, checkout
- **Access**: Public access, no login required

### WhatsApp Storefront
- **Integration**: Direct WhatsApp Business API
- **Features**: Product discovery, cart management, checkout
- **Access**: Through WhatsApp conversation

## Monitoring and Analytics

### Subdomain Analytics
- Track performance per merchant subdomain
- Monitor custom domain usage
- Analyze WhatsApp integration metrics

### Error Handling
- 404 for non-existent subdomains
- Proper error pages for inactive merchants
- Maintenance mode support

## Migration Guide

### From Old Structure
If migrating from a different domain structure:

1. **Update DNS Records**
   ```bash
   # Add wildcard record
   *.enwhe.io -> [Server IP]
   ```

2. **Update Environment Variables**
   ```bash
   BASE_DOMAIN=enwhe.io
   NEXT_PUBLIC_BASE_DOMAIN=enwhe.io
   ```

3. **Update Merchant Records**
   ```sql
   -- Update existing merchants with new subdomain format
   UPDATE tenants SET subdomain = CONCAT(LEFT(id::text, 6), '.enwhe.io');
   ```

4. **Test Subdomain Routing**
   ```bash
   # Test merchant subdomain
   curl -H "Host: abc123.enwhe.io" https://your-server.com
   ```

## Troubleshooting

### Common Issues

#### 1. Subdomain Not Resolving
```bash
# Check DNS propagation
nslookup abc123.enwhe.io

# Check wildcard DNS record
dig *.enwhe.io
```

#### 2. SSL Certificate Issues
```bash
# Check SSL certificate
openssl s_client -connect abc123.enwhe.io:443 -servername abc123.enwhe.io
```

#### 3. CORS Errors
```bash
# Check CORS configuration
curl -H "Origin: https://abc123.enwhe.io" https://api.enwhe.io/api/v1/health
```

### Debug Commands

#### Check Subdomain Resolution
```bash
# Test subdomain middleware
curl -H "Host: abc123.enwhe.io" http://localhost:8000/api/v1/health
```

#### Check Tenant Context
```bash
# Verify tenant context is set
curl -H "Host: abc123.enwhe.io" http://localhost:8000/api/v1/tenant/me
```

## Best Practices

### 1. Subdomain Naming
- Use first 6 characters of merchant UUID
- Ensure uniqueness across all merchants
- Avoid reserved subdomains (www, api, admin)

### 2. Custom Domain Setup
- Provide clear DNS instructions
- Verify domain ownership
- Support both apex and www domains

### 3. Performance Optimization
- Use CDN for static assets
- Implement caching per subdomain
- Monitor performance metrics

### 4. Security
- Implement rate limiting per subdomain
- Use HTTPS for all subdomains
- Regular security audits

## Future Enhancements

### Planned Features
1. **Subdomain Customization**: Allow merchants to choose custom subdomains
2. **Multi-Region Support**: Regional subdomains (us.enwhe.io, ke.enwhe.io)
3. **Branded Subdomains**: Custom subdomain prefixes
4. **Domain Aliases**: Multiple custom domains per merchant

### API Endpoints
```bash
# Get merchant by subdomain
GET /api/v1/tenants/by-subdomain/{subdomain}

# Get merchant by custom domain
GET /api/v1/tenants/by-domain/{domain}

# Update merchant domain settings
PUT /api/v1/tenants/{tenant_id}/domains
```

This merchant subdomain structure provides a scalable, professional solution for multi-tenant commerce while maintaining the flexibility for custom domains.