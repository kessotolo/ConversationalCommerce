# Admin Dashboard

Super Admin dashboard for ConversationalCommerce platform - staff-only access with comprehensive security features.

## 🚀 Deployment Guide

### Prerequisites

1. **Domain Setup**: Ensure `admin.enwhe.io` is configured and pointing to your deployment
2. **Backend API**: Your backend must be deployed and accessible (Railway recommended)
3. **Clerk Organization**: Set up Clerk with organization feature for staff authentication

### Deploy to Vercel

#### 1. Create New Vercel Project

```bash
# Navigate to admin dashboard directory
cd admin-dashboard

# Install Vercel CLI (if not already installed)
npm i -g vercel

# Deploy to Vercel
vercel
```

#### 2. Configure Environment Variables in Vercel

In your Vercel project settings, add these environment variables:

**Required Variables:**
```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_ADMIN_DOMAIN=admin.enwhe.io
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

**Optional Variables:**
```
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

#### 3. Configure Custom Domain

1. Go to your Vercel project settings
2. Navigate to "Domains"
3. Add `admin.enwhe.io` as a custom domain
4. Update your DNS records as instructed by Vercel

#### 4. Backend Configuration

Ensure your backend (Railway) has these environment variables set:

```
ALLOWED_ORIGINS=https://admin.enwhe.io
BACKEND_CORS_ORIGINS=https://admin.enwhe.io
ADMIN_ENFORCE_IP_RESTRICTIONS=true
ADMIN_REQUIRE_2FA=true
ADMIN_MODE=true
```

## 🔒 Security Features

### Staff-Only Access
- Only users with "staff" role can access admin endpoints
- Clerk organization membership required
- JWT token validation with role checking

### IP Allowlisting
- Global IP allowlist enforcement for all admin endpoints
- Configurable per-user, per-role, and per-tenant restrictions
- Temporary bypass functionality for emergencies

### Enhanced Security Headers
- Strict Transport Security (HSTS)
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer Policy: strict-origin-when-cross-origin

### Two-Factor Authentication
- TOTP-based 2FA for admin accounts
- Backup codes for recovery
- Configurable 2FA requirements by role

## 🛠️ Development

### Local Development Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp env.example .env.local

# Update .env.local with your values
# NEXT_PUBLIC_API_URL=http://localhost:8000
# ... other variables

# Start development server
npm run dev
```

### Build and Test

```bash
# Build for production
npm run build

# Start production server locally
npm start

# Run linting
npm run lint
```

## 🔧 Configuration

### API Endpoints

The admin dashboard connects to these backend endpoints:

- `/api/admin/monitoring/*` - System health and metrics
- `/api/admin/auth/*` - Authentication and authorization
- `/api/admin/users/*` - Admin user management
- `/api/admin/tenants/*` - Tenant management
- `/api/admin/feature-flags/*` - Feature flag management
- `/api/admin/audit-logs/*` - Audit log viewing
- `/api/admin/ip-allowlist/*` - IP allowlist management
- `/api/admin/security/*` - Security settings and 2FA

### Authentication Flow

1. User visits `admin.enwhe.io`
2. Clerk handles authentication with organization check
3. Backend validates JWT and checks for "staff" role
4. IP address is validated against allowlist
5. 2FA verification (if enabled)
6. User gains access to admin dashboard

## 📊 Features

### System Monitoring
- Real-time system health dashboard
- Performance metrics and alerts
- Resource usage monitoring
- Application performance tracking

### User Management
- Admin user creation and management
- Role-based access control (RBAC)
- Permission management interface
- User activity tracking

### Tenant Management
- Tenant overview and controls
- Tenant suspension/activation
- Cross-tenant analytics
- Impersonation capabilities

### Security Management
- IP allowlist configuration
- 2FA management
- Security audit logs
- Emergency controls

### Feature Flags
- Global feature flag management
- Tenant-specific overrides
- A/B testing controls
- Feature rollout management

## 🚨 Emergency Procedures

### Emergency Lockout
If you need to emergency lock the admin system:

1. Set `ADMIN_ENFORCE_IP_RESTRICTIONS=true` in backend
2. Remove all IPs from the global allowlist
3. Use the emergency bypass if configured

### Reset 2FA
If an admin user loses 2FA access:

1. Use backup codes if available
2. Super admin can reset 2FA for other users
3. Database-level reset as last resort

## 📝 Monitoring and Logs

### Application Logs
- All admin actions are logged for audit
- Real-time log streaming in dashboard
- Structured JSON logging for analysis

### Security Monitoring
- Failed authentication attempts
- IP allowlist violations
- Suspicious activity detection
- Real-time security alerts

## 🔄 Updates and Maintenance

### Deployment Updates
```bash
# Update dependencies
npm update

# Deploy to Vercel
vercel --prod
```

### Security Updates
- Regularly update all dependencies
- Monitor security advisories
- Update IP allowlists as needed
- Review and rotate API keys

## 🆘 Support

For issues with the admin dashboard:

1. Check application logs in Vercel dashboard
2. Verify backend API connectivity
3. Check Clerk authentication setup
4. Review security configurations
5. Contact development team if needed

## 📚 Related Documentation

- [Super Admin Implementation Guide](../docs/SUPER_ADMIN_IMPLEMENTATION.md)
- [Security Best Practices](../docs/SECURITY_BEST_PRACTICES.md)
- [Admin Features Guide](../docs/ADMIN_FEATURES_GUIDE.md)
- [Backend API Documentation](../backend/README.md)