# Multi-Tenant Architecture Documentation

## Overview

This document outlines the multi-tenant architecture implemented in the Conversational Commerce platform, including the domain routing, tenant isolation, super admin impersonation flow, and security considerations.

## Key Components

### 1. Tenant Model

The `Tenant` model is the central entity representing a merchant/seller in our multi-tenant system:

```python
class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, index=True)
    subdomain = Column(String(63), nullable=False, unique=True, index=True)
    custom_domain = Column(String(253), nullable=True, unique=True, index=True)
    
    # Admin user who owns this tenant
    admin_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Tenant status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Branding
    display_name = Column(String(100), nullable=True)
    logo_url = Column(String(255), nullable=True)
    primary_color = Column(String(7), nullable=True)
    secondary_color = Column(String(7), nullable=True)
```

Key features:
- Unique subdomain (required) and optional custom domain
- Relationship to an admin user (tenant owner)
- Status tracking (active/inactive, verified)
- Branding customization options

### 2. Domain Routing

Domain routing enables access to tenant storefronts via both subdomains and custom domains:

#### Backend Domain Resolution

```python
# Tenant Resolver API
@router.get("/api/tenant/resolve")
async def resolve_tenant(hostname: str, db: AsyncSession):
    tenant_service = TenantService()
    tenant = await tenant_service.resolve_tenant_by_hostname(
        db=db,
        hostname=hostname,
        base_domain=settings.BASE_DOMAIN
    )
    # Return tenant information
```

#### Frontend Domain Middleware (Next.js)

```typescript
// middleware.ts
async function middlewareImplementation(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  
  // Extract tenant identifier (subdomain or custom domain)
  let tenantIdentifier = 'default';
  let identifierType = 'subdomain';
  
  // Check if subdomain of primary domain
  if (hostname.endsWith(`.${primaryDomain}`)) {
    tenantIdentifier = hostname.split('.')[0];
  } 
  // Otherwise treat as custom domain
  else {
    tenantIdentifier = hostname;
    identifierType = 'custom_domain';
  }
  
  // Resolve tenant and set context
  const tenantContext = await resolveTenant(tenantIdentifier, identifierType);
  // Continue with tenant context
}
```

### 3. Tenant Isolation

Data isolation between tenants is enforced through:

1. **Application-level filtering**: Service functions include tenant ID filters in database queries
2. **Row-level security (RLS)**: PostgreSQL policies that enforce tenant-level access restrictions
3. **Foreign key constraints**: Tenant relationships enforced via database constraints

Example of application-level filtering:

```python
async def get_tenant_data(db: AsyncSession, tenant_id: UUID):
    query = select(Data).where(Data.tenant_id == tenant_id)
    result = await db.execute(query)
    return result.scalars().all()
```

Example of PostgreSQL RLS policy (applied by DBA):

```sql
-- Enable RLS on table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to filter rows by tenant_id
CREATE POLICY tenant_isolation_policy ON users
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### 4. Super Admin Impersonation Flow

The platform includes a secure impersonation mechanism that allows super admins to log in as tenant owners for support purposes:

#### Impersonation Flow

1. **Token Generation**: Super admin requests impersonation token for a specific tenant
   ```python
   token = await impersonation_service.create_impersonation_token(
       db=db,
       admin_user_id=admin_user.user_id,
       tenant_id=tenant_id,
       expires_delta=timedelta(minutes=30)  # Short-lived token
   )
   ```

2. **Token Validation**: Tenant frontend validates impersonation token
   ```typescript
   const verification = await verifyImpersonationToken(token);
   if (verification.valid) {
     // Establish impersonation session
     sessionStorage.setItem('impersonationActive', 'true');
     sessionStorage.setItem('impersonationToken', token);
   }
   ```

3. **Audit Logging**: All impersonation events are logged for security and compliance

4. **Session Termination**: Explicit ending of impersonation sessions

## Security Considerations

### 1. Cross-Tenant Access Controls

- Super admin roles have platform-wide access
- Regular admin roles have tenant-specific access
- RBAC system with permission scopes (global, tenant, self)

### 2. Domain Security

- Strict CORS configuration to limit cross-domain requests
- Domain-specific JWT audience claims
- Separate domains for main app and admin dashboard for cookie isolation

### 3. Authentication & Authorization

- JWT tokens with tenant context
- Two-factor authentication enforced for admin users
- IP range restrictions for admin access

### 4. Data Isolation

- Row-level security in PostgreSQL
- Tenant-aware services and middleware
- Database-level foreign key constraints

## Deployment Architecture

### Tenant Provisioning

1. **Tenant Creation**: When a new merchant signs up, a tenant record is created with:
   - Auto-generated subdomain
   - Optional custom domain (if provided)
   - Default branding settings

2. **Domain Configuration**:
   - Subdomain: Automatically available under `{subdomain}.yourplatform.com`
   - Custom domain: Requires DNS configuration (CNAME and TXT verification)

### Domain Hosting

- **Frontend**: Hosted on Vercel with wildcard subdomain support
- **Backend**: Hosted on Railway with shared database and tenant isolation

## Testing Strategy

### 1. Tenant Isolation Tests

- Verify data access respects tenant boundaries
- Test cross-tenant operations with super admin permissions
- Validate that tenant-specific queries return only tenant data

### 2. Domain Routing Tests

- Test subdomain resolution
- Test custom domain resolution
- Validate proper tenant context establishment

### 3. Impersonation Flow Tests

- Test impersonation token generation and validation
- Verify audit logging of impersonation events
- Test impersonation session termination

## Implementation Checklist

- [x] Tenant model and database schema
- [x] Tenant resolver API
- [x] Domain routing middleware
- [x] Super admin impersonation flow
- [ ] Row-level security policies (to be implemented by DBA)
- [ ] Comprehensive audit logging (to be enhanced)
- [ ] Automated tenant provisioning workflow (future enhancement)
