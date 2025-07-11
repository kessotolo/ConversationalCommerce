# Migration Guide: Clerk → In-House Authentication

## Overview

This guide provides step-by-step instructions for migrating from Clerk to in-house authentication while maintaining zero downtime and full functionality.

## Prerequisites

✅ **Current Architecture Status (100% Complete)**
- JWT validation is abstracted (`clerk_multi_org.py`)
- All user/role/permission data is in our database
- Service layer is modular (`AdminService`)
- Multi-tenant isolation is implemented
- Comprehensive test coverage exists

## Migration Strategy

### Phase 1: Parallel Implementation (2-4 weeks)

**Goal**: Deploy custom auth alongside Clerk without affecting existing users

#### Step 1: Create Custom JWT Service

```python
# app/core/security/custom_jwt.py
import jwt
from datetime import datetime, timedelta
from typing import Dict, Any

class CustomJWTService:
    def __init__(self):
        self.secret = settings.JWT_SECRET
        self.algorithm = settings.JWT_ALGORITHM
        self.expiry_hours = settings.JWT_EXPIRY_HOURS

    def create_token(self, user_id: str, email: str, **kwargs) -> str:
        """Create a JWT token for a user."""
        payload = {
            "sub": user_id,
            "email": email,
            "exp": datetime.utcnow() + timedelta(hours=self.expiry_hours),
            "iat": datetime.utcnow(),
            "iss": "conversationalcommerce.com",
            **kwargs
        }
        return jwt.encode(payload, self.secret, algorithm=self.algorithm)

    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify a JWT token."""
        try:
            payload = jwt.decode(token, self.secret, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
```

#### Step 2: Create Custom Auth UI Components

```typescript
// frontend/src/components/auth/CustomLoginForm.tsx
import { useState } from 'react';

export const CustomLoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const { token } = await response.json();
      // Store token and redirect
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
};
```

#### Step 3: Create Auth API Endpoints

```python
# app/api/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException
from app.core.security.custom_jwt import CustomJWTService
from app.services.admin.admin_service import AdminService

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
async def login(
    credentials: LoginCredentials,
    db: AsyncSession = Depends(get_db)
):
    """Custom login endpoint."""
    # Validate credentials
    admin_user = await authenticate_user(db, credentials.email, credentials.password)
    if not admin_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create custom JWT
    jwt_service = CustomJWTService()
    token = jwt_service.create_token(
        user_id=admin_user.id,
        email=admin_user.email
    )

    return {"token": token, "user": admin_user}

@router.post("/refresh")
async def refresh_token(
    current_user: MultiOrgClerkTokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Refresh JWT token."""
    jwt_service = CustomJWTService()
    new_token = jwt_service.create_token(
        user_id=current_user.user_id,
        email=current_user.email
    )

    return {"token": new_token}
```

#### Step 4: Update JWT Validation

```python
# app/core/security/auth_service.py
class AuthService:
    def __init__(self):
        self.clerk_service = multi_org_clerk_service
        self.custom_jwt_service = CustomJWTService()

    def verify_token(self, token: str) -> MultiOrgClerkTokenData:
        """Verify token from either Clerk or custom JWT."""
        try:
            # Try custom JWT first
            payload = self.custom_jwt_service.verify_token(token)
            return MultiOrgClerkTokenData(
                sub=payload["sub"],
                email=payload["email"],
                roles=[],  # DB-driven
                organization_source="custom"
            )
        except HTTPException:
            # Fallback to Clerk
            return self.clerk_service.verify_token(token)
```

### Phase 2: Gradual Migration (1-2 weeks)

**Goal**: Migrate users from Clerk to custom auth with zero downtime

#### Step 1: Add Migration Flag to User Model

```python
# app/models/admin/admin_user.py
class AdminUser(Base):
    # ... existing fields ...
    auth_provider = Column(String, default="clerk")  # "clerk" or "custom"
    migrated_at = Column(DateTime(timezone=True))
```

#### Step 2: Create Migration Service

```python
# app/services/admin/migration_service.py
class MigrationService:
    async def migrate_user_to_custom_auth(
        self,
        db: AsyncSession,
        clerk_user_id: str
    ) -> bool:
        """Migrate a user from Clerk to custom auth."""
        admin_user = await self.admin_service.get_admin_user_by_clerk_id(
            db, clerk_user_id
        )

        if not admin_user:
            return False

        # Update user to use custom auth
        admin_user.auth_provider = "custom"
        admin_user.migrated_at = datetime.utcnow()

        await db.commit()
        return True

    async def get_migration_status(self, db: AsyncSession) -> Dict[str, Any]:
        """Get migration progress."""
        total_users = await db.execute(
            select(func.count(AdminUser.id))
        ).scalar()

        migrated_users = await db.execute(
            select(func.count(AdminUser.id))
            .where(AdminUser.auth_provider == "custom")
        ).scalar()

        return {
            "total_users": total_users,
            "migrated_users": migrated_users,
            "migration_percentage": (migrated_users / total_users * 100) if total_users > 0 else 0
        }
```

#### Step 3: Create Migration Dashboard

```typescript
// admin-dashboard/src/modules/auth/components/MigrationDashboard.tsx
export const MigrationDashboard = () => {
  const [migrationStatus, setMigrationStatus] = useState(null);

  const migrateUser = async (userId: string) => {
    await api.post(`/admin/migration/migrate/${userId}`);
    // Refresh status
  };

  return (
    <div>
      <h2>Auth Migration Status</h2>
      <div>Migrated: {migrationStatus?.migrated_users}/{migrationStatus?.total_users}</div>
      <div>Progress: {migrationStatus?.migration_percentage}%</div>
      {/* Migration controls */}
    </div>
  );
};
```

### Phase 3: Complete Migration (1 week)

**Goal**: Remove Clerk dependencies and complete the migration

#### Step 1: Update Environment Variables

```bash
# Remove Clerk variables
# SELLER_CLERK_SECRET_KEY=...
# ADMIN_CLERK_SECRET_KEY=...

# Add custom JWT variables
JWT_SECRET=your-secure-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=24
```

#### Step 2: Update Frontend Components

```typescript
// Replace Clerk components with custom auth
// frontend/src/components/auth/AuthProvider.tsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { token } = response.data;

    // Store token
    localStorage.setItem('auth_token', token);

    // Get user info
    const userResponse = await api.get('/auth/me');
    setUser(userResponse.data);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### Step 3: Remove Clerk Dependencies

```bash
# Remove Clerk packages
npm uninstall @clerk/nextjs @clerk/themes

# Remove Clerk configuration
rm frontend/src/lib/clerk.ts
rm frontend/src/middleware.ts
```

#### Step 4: Update Database Schema

```sql
-- Add migration timestamp if not exists
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMP WITH TIME ZONE;

-- Update any remaining Clerk user IDs
UPDATE admin_users
SET auth_provider = 'custom'
WHERE auth_provider IS NULL;
```

## Testing Strategy

### Pre-Migration Tests

```python
# tests/test_auth_migration.py
class TestAuthMigration:
    def test_custom_jwt_creation(self):
        """Test custom JWT creation and validation."""
        jwt_service = CustomJWTService()
        token = jwt_service.create_token("user123", "test@example.com")

        payload = jwt_service.verify_token(token)
        assert payload["sub"] == "user123"
        assert payload["email"] == "test@example.com"

    def test_parallel_auth_systems(self):
        """Test that both Clerk and custom auth work simultaneously."""
        # Test Clerk token
        clerk_token = "test_token"
        clerk_result = auth_service.verify_token(clerk_token)
        assert clerk_result.organization_source == "seller"

        # Test custom token
        custom_token = custom_jwt_service.create_token("user123", "test@example.com")
        custom_result = auth_service.verify_token(custom_token)
        assert custom_result.organization_source == "custom"

    def test_user_migration(self):
        """Test user migration from Clerk to custom auth."""
        # Create test user with Clerk
        admin_user = create_admin_user(clerk_user_id="user_clerk_123")

        # Migrate to custom auth
        success = migration_service.migrate_user_to_custom_auth(db, "user_clerk_123")
        assert success is True

        # Verify migration
        updated_user = get_admin_user_by_clerk_id(db, "user_clerk_123")
        assert updated_user.auth_provider == "custom"
        assert updated_user.migrated_at is not None
```

### Post-Migration Tests

```python
# tests/test_custom_auth.py
class TestCustomAuth:
    def test_login_flow(self):
        """Test complete login flow with custom auth."""
        # Login
        response = client.post("/auth/login", json={
            "email": "admin@example.com",
            "password": "password123"
        })
        assert response.status_code == 200

        token = response.json()["token"]

        # Use token for authenticated request
        headers = {"Authorization": f"Bearer {token}"}
        me_response = client.get("/admin/me", headers=headers)
        assert me_response.status_code == 200

    def test_role_assignment(self):
        """Test that roles are still DB-driven after migration."""
        # Login and get token
        token = get_auth_token()

        # Verify roles come from database, not JWT
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/admin/me", headers=headers)

        user_data = response.json()
        assert "roles" in user_data
        # Roles should be from database, not hardcoded
```

## Rollback Plan

If issues arise during migration:

### Immediate Rollback
```python
# Revert to Clerk-only authentication
def verify_token_fallback(token: str) -> MultiOrgClerkTokenData:
    """Fallback to Clerk-only validation."""
    return multi_org_clerk_service.verify_token(token)
```

### Database Rollback
```sql
-- Revert user migration
UPDATE admin_users
SET auth_provider = 'clerk', migrated_at = NULL
WHERE auth_provider = 'custom';
```

## Monitoring and Metrics

### Key Metrics to Track
- Authentication success rate
- Token validation performance
- User migration progress
- Error rates by auth provider
- API response times

### Alerts to Set Up
- High authentication failure rate
- Token validation errors
- Migration failures
- Performance degradation

## Security Considerations

### Token Security
- Use strong JWT secrets
- Implement token rotation
- Set appropriate expiration times
- Validate token claims

### Data Protection
- Encrypt sensitive user data
- Implement proper password hashing
- Use HTTPS for all auth endpoints
- Audit all authentication events

## Performance Optimization

### Caching Strategy
```python
# Cache user data to reduce database queries
@cache_response(ttl=300)  # 5 minutes
async def get_admin_user_by_clerk_id(db, clerk_user_id: str):
    # Database lookup with caching
```

### Database Optimization
```sql
-- Add indexes for auth queries
CREATE INDEX idx_admin_users_clerk_id ON admin_users(clerk_user_id);
CREATE INDEX idx_admin_users_auth_provider ON admin_users(auth_provider);
```

## Conclusion

This migration guide provides a comprehensive path from Clerk to in-house authentication while maintaining:

- ✅ Zero downtime
- ✅ Full functionality
- ✅ Security best practices
- ✅ Performance optimization
- ✅ Comprehensive testing
- ✅ Rollback capabilities

The modular architecture ensures that the migration can be completed safely and efficiently, with full control over the authentication system going forward.