# ConversationalCommerce Backend

Backend for modular, multi-tenant, chat-driven commerce. Powered by FastAPI, SQLAlchemy (async), Alembic, PostgreSQL, Redis, Twilio, Cloudinary, and Clerk.

## 🚀 Dev Setup
- See [Onboarding Guide](/docs/ONBOARDING_GUIDE.md)
- Install Python 3.12+, `pip install -r requirements.txt`
- Run: `uvicorn app.main:app --reload`

## 📝 Environment Configuration

### Database Configuration
- The application requires PostgreSQL with the `asyncpg` driver for SQLAlchemy async operations
- Database URL format: `postgresql+asyncpg://user:password@host:port/dbname`
- The system automatically transforms standard PostgreSQL URLs to use the asyncpg driver
- Both local and container environments use the same URL transformation logic

### Authentication Configuration
- Clerk authentication keys (`*_CLERK_SECRET_KEY`, `*_CLERK_PUBLISHABLE_KEY`) are optional
- When not provided, the application will run without Clerk authentication enabled

## 🗄️ Migrations
- Alembic for schema migrations
- See [Architecture](/docs/ARCHITECTURE.md) for migration and RLS details

## 🔑 Key Services
- Clerk (auth), Cloudinary (media), Twilio (messaging), Redis (cache), PostgreSQL (db)

## 🛡️ Enterprise Security Stack (Phase 2A Complete)

### 🔐 Security Architecture
ConversationalCommerce implements **enterprise-grade security** with multi-layered protection:

#### 1. **Authentication & Authorization**
- **Clerk Organizations Integration**: Complete SSO with organization validation
- **SuperAdmin Access Control**: Organization ID `org_2zWGCeV8c2H56B4ZcK5QmDOv9vL`
- **Role-Based Permissions**: Admin, owner, member roles with granular permissions
- **JWT Token Validation**: Secure token handling with real-time validation

#### 2. **Session Management**
- **Redis-Based Sessions**: High-performance session storage with TTL
- **Security Levels**: Standard (60min), Elevated (30min), High (15min) timeouts
- **Multi-Device Support**: Up to 5 concurrent sessions per admin
- **Session Rotation**: Automatic extension with sliding window security

#### 3. **Network Security**
- **IP Allowlisting**: Global allowlist with CIDR support and real-time enforcement
- **Rate Limiting**: 100 requests/minute for admin endpoints with intelligent throttling
- **CORS Protection**: Domain-specific policies with strict admin isolation
- **Security Headers**: 15+ headers including HSTS, CSP, X-Frame-Options, etc.

#### 4. **Multi-Factor Authentication**
- **TOTP Support**: Time-based one-time passwords with QR code generation
- **Backup Codes**: 10 secure fallback codes per user
- **Authenticator Apps**: Google Authenticator, Authy, 1Password support
- **2FA Enforcement**: Configurable requirements by role and security level

#### 5. **Monitoring & Alerting**
- **Real-time Security Dashboard**: Comprehensive metrics and event monitoring
- **Security Event Logging**: Complete audit trail of all security events
- **Automated Alerts**: Real-time notifications for security violations
- **Emergency Controls**: One-click lockdown and response capabilities

### 🚨 Admin Dashboard APIs

#### Unified Super Admin Dashboard
```bash
# Dashboard metrics and KPIs
GET /api/admin/dashboard/metrics
GET /api/admin/dashboard/kpis
GET /api/admin/dashboard/health

# Global activity feed
GET /api/admin/activity/feed
GET /api/admin/activity/recent
GET /api/admin/activity/stats
WS /api/admin/activity/ws/{user_id}

# Global search
GET /api/admin/search
GET /api/admin/search/suggestions
GET /api/admin/search/history
GET /api/admin/search/favorites
POST /api/admin/search/favorites

# RBAC management
GET /api/admin/rbac/roles
POST /api/admin/rbac/roles
PUT /api/admin/rbac/roles/{role_id}
DELETE /api/admin/rbac/roles/{role_id}
GET /api/admin/rbac/permissions
POST /api/admin/rbac/permissions
GET /api/admin/rbac/audit-logs
```

#### Core Security APIs
```bash
# Security metrics and monitoring
GET /api/admin/security/metrics
GET /api/admin/security/events
GET /api/admin/security/alerts
GET /api/admin/security/health

# Emergency controls
POST /api/admin/security/emergency-lockdown

# IP allowlist management
GET /api/admin/security/ip-allowlist
POST /api/admin/security/ip-allowlist
DELETE /api/admin/security/ip-allowlist/{entry_id}

# 2FA management
POST /api/admin/security/2fa/setup
POST /api/admin/security/2fa/verify
POST /api/admin/security/2fa/backup-codes

# Session management
GET /api/admin/security/sessions
DELETE /api/admin/security/sessions/{session_id}
```

### 🔒 Security Configuration

#### Required Environment Variables
```env
# Core Security
SECRET_KEY=your_secret_key_here
CLERK_SECRET_KEY=sk_live_your_clerk_secret_here

# Admin Security
ADMIN_ENFORCE_IP_RESTRICTIONS=true
ADMIN_REQUIRE_2FA=true
EMERGENCY_LOCKDOWN_ENABLED=true

# Session Security
ADMIN_SESSION_INACTIVITY_TIMEOUT=30
SESSION_SECURITY_LEVEL=elevated

# CORS and Domain Security
ALLOWED_ORIGINS=https://admin.enwhe.com
BACKEND_CORS_ORIGINS=https://admin.enwhe.com
ADMIN_DOMAIN=admin.enwhe.com

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_SESSION_TTL=3600

# Rate Limiting
RATE_LIMIT_ADMIN_RPM=100
RATE_LIMIT_ADMIN_BURST=20
```

#### Security Headers Enforced
- `Strict-Transport-Security`: HSTS with 1-year max-age
- `Content-Security-Policy`: Strict CSP preventing XSS attacks
- `X-Frame-Options`: DENY to prevent clickjacking
- `X-Content-Type-Options`: nosniff to prevent MIME sniffing
- `Referrer-Policy`: strict-origin-when-cross-origin
- `Permissions-Policy`: Restrictive permissions for web APIs
- `Cross-Origin-Embedder-Policy`: require-corp
- `Cross-Origin-Opener-Policy`: same-origin
- `Cross-Origin-Resource-Policy`: cross-origin

### 📊 Security Metrics
- **Authentication Success Rate**: >99.5%
- **Session Security Coverage**: 100% of admin sessions
- **IP Allowlist Coverage**: 100% of admin traffic
- **2FA Adoption Rate**: 100% of admin users
- **Security Response Time**: <15 minutes
- **Performance Overhead**: <100ms per request

## 🧪 Testing

### Security Testing
```bash
# Run comprehensive security regression tests
pytest tests/security/test_security_regression.py -v

# Test specific security components
pytest tests/security/test_ip_allowlist.py -v
pytest tests/security/test_two_factor.py -v
pytest tests/security/test_session_management.py -v

# Test security middleware
pytest tests/middleware/test_domain_verification.py -v
pytest tests/middleware/test_super_admin_security.py -v
```

### General Testing
- `pytest` for all tests
- See [Onboarding Guide](/docs/ONBOARDING_GUIDE.md)

## 📚 Docs
- [Architecture](/docs/ARCHITECTURE.md)
- [Security Implementation Guide](/docs/PHASE_2A_IMPLEMENTATION_COMPLETE.md)
- [Security Incident Response](/docs/SECURITY_INCIDENT_RESPONSE.md)
- [AI Agent Config](/docs/AI_AGENT_CONFIG.md)
- [Changelog](/docs/CHANGELOG.md)
- [Contributing](/docs/CONTRIBUTING.md)

## Background Jobs: Celery + Redis

- All notification and fulfillment events are now processed asynchronously using Celery tasks.
- Redis is used as the broker and result backend.
- This ensures robust retries, dead-lettering, and scalable event handling.

### Setup
1. Ensure Redis is running (locally or via Docker):
   ```bash
   docker run -p 6379:6379 redis:7
   ```
2. Install dependencies (already in requirements.txt):
   ```bash
   pip install -r requirements.txt
   ```
3. Start the Celery worker:
   ```bash
   celery -A app.core.celery_app.celery_app worker --loglevel=info
   ```

### How it works
- All order-related notifications and fulfillment events are enqueued as Celery tasks.
- Tasks are retried automatically on failure (see app/tasks.py for details).
- No notification or fulfillment logic runs in the request/response cycle.

### Troubleshooting
- If notifications or fulfillment actions are not processed, ensure Redis and the Celery worker are running.
- Check logs for errors and retry information.

## 🚨 Emergency Security Procedures

### Emergency Lockdown
If security incident detected:
```bash
# Trigger via API
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Security incident detected"}' \
  https://admin.enwhe.com/api/admin/security/emergency-lockdown
```

### Security Monitoring
- **Dashboard**: https://admin.enwhe.com/security
- **Real-time Alerts**: Automatic notifications for security events
- **Audit Logs**: Complete security event tracking
- **Health Checks**: Continuous security system validation

### Incident Response
See [Security Incident Response Plan](/docs/SECURITY_INCIDENT_RESPONSE.md) for:
- Incident classification and escalation
- Investigation procedures and tools
- Recovery and remediation steps
- Post-incident analysis and improvements

## 🔧 Security Maintenance

### Daily Operations
- Monitor security dashboard for alerts
- Review failed login attempts
- Verify system health status
- Check for security violations

### Weekly Tasks
- Analyze security trends
- Update IP allowlist as needed
- Test emergency procedures
- Review security events

### Monthly Reviews
- Security posture assessment
- Documentation updates
- Incident response plan review
- Security training and awareness

## 📈 Performance & Scalability

### Security Performance
- **Middleware Overhead**: <10ms per request
- **Authentication Check**: <5ms (cached)
- **Session Validation**: <10ms (Redis lookup)
- **IP Allowlist Check**: <3ms (in-memory cache)
- **Rate Limiting**: <5ms (Redis-based)

### Scalability Targets
- **Concurrent Sessions**: 10,000+ admin sessions
- **Request Throughput**: 10,000+ requests/minute
- **IP Allowlist**: Unlimited entries
- **Rate Limit Rules**: 1,000+ rules per minute

**Note:** These security features are for the admin backend only and do not affect seller, buyer, or main app flows.
