# Backend Service for Conversational Commerce Platform

This backend service powers the Conversational Commerce platform, providing a high-performance API with robust security and multi-tenant architecture.

## 🔐 Multi-Tenant Architecture with PostgreSQL RLS

The platform uses PostgreSQL Row-Level Security (RLS) to enforce tenant isolation at the database level, ensuring that data can never be accessed across tenant boundaries even if application-level security is bypassed.

### Key Components

#### 1. Tenant Model and Database Structure

- Each tenant has a unique UUID identifier stored in the `tenants` table
- All data models include a `tenant_id` foreign key reference to the tenant
- Tables with RLS enabled:
  - `users`
  - `seller_profiles`
  - `products`
  - `orders`
  - `conversation_history`
  - `ai_config`

#### 2. Row-Level Security Policies

PostgreSQL RLS policies are applied to all tenant-scoped tables, allowing rows to be read only when the current session's `tenant_id` matches the row's `tenant_id`:

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON table_name
  USING (tenant_id::uuid = current_setting('my.tenant_id')::uuid);
ALTER TABLE table_name FORCE ROW LEVEL SECURITY;
```

#### 3. Tenant Context Middleware

The `TenantMiddleware` class:
- Extracts the tenant ID from the `X-Tenant-ID` header
- Validates that the tenant exists in the database
- Sets the tenant ID in request state for access in dependencies
- Sets the PostgreSQL session variable for RLS enforcement
- Bypasses tenant checks for public endpoints (health checks, docs)

#### 4. Database Session Management

- `set_tenant_id()` function sets the PostgreSQL session variable using parameterized queries
- `get_db()` dependency automatically applies tenant context from request state
- Services use the tenant context for all database operations

### 🚦 Rate Limiting and Resource Quotas

The platform implements tenant-specific rate limiting and resource quotas to ensure fair usage and prevent abuse.

#### 1. Rate Limiting

- **Per-Tenant Limits:**
  - Requests per minute (default: 60)
  - Requests per hour (default: 1000)
  - Requests per day (default: 10000)

- **Rate Limit Headers:**
  ```
  X-RateLimit-Limit-Minute: 60
  X-RateLimit-Remaining-Minute: 59
  X-RateLimit-Limit-Hour: 1000
  X-RateLimit-Remaining-Hour: 999
  X-RateLimit-Limit-Day: 10000
  X-RateLimit-Remaining-Day: 9999
  ```

#### 2. Resource Quotas

- **Storage Limits:**
  - Maximum storage per tenant (default: 1GB)
  - Current storage usage tracking

- **Product Limits:**
  - Maximum products per tenant (default: 1000)
  - Current product count tracking

- **User Limits:**
  - Maximum users per tenant (default: 100)
  - Current user count tracking

#### 3. API Usage Tracking

- Tracks API calls at multiple time intervals:
  - Per minute
  - Per hour
  - Per day
- Automatically resets counters daily
- Persists usage data in the database

### 🔒 Progressive Trust System (Planned)

The platform will implement a comprehensive progressive trust system to ensure platform security and enable feature access based on seller trustworthiness.

#### 1. Trust Levels

- **Level 0: Unverified Seller**
  - Basic profile creation
  - Limited to 5 product listings
  - Manual order processing
  - Basic store features

- **Level 1: Verified Seller**
  - Email and phone verified
  - Business details verified
  - Up to 50 product listings
  - Basic automation features
  - Payment processing enabled

- **Level 2: Trusted Seller**
  - Business registration verified
  - Tax information verified
  - Full product listing capacity
  - Advanced automation features
  - Priority support access
  - Bulk operations enabled

- **Level 3: Premium Seller**
  - All verifications complete
  - Excellent performance metrics
  - Unlimited products
  - Full platform features
  - API access
  - Custom integrations

#### 2. Verification Process

- **Basic Verification**
  - Email verification
  - Phone number verification
  - Basic business information
  - Store setup completion

- **Business Verification**
  - Business registration document
  - Tax identification
  - Business address verification
  - Bank account verification

- **Performance Verification**
  - Order fulfillment rate
  - Customer satisfaction metrics
  - Response time metrics
  - Dispute resolution rate

#### 3. Trust Score System

The trust score will be calculated based on:
- Account age
- Order volume
- Customer ratings
- Response time
- Dispute resolution rate
- Payment history
- Platform rule compliance

#### 4. Feature Access by Level

- **Level 0 Features**
  - Basic store setup
  - Manual order management
  - Basic product listings
  - Standard support

- **Level 1 Features**
  - Automated order processing
  - Basic analytics
  - Email notifications
  - Payment processing

- **Level 2 Features**
  - Advanced analytics
  - Bulk operations
  - Custom automation rules
  - Priority support

- **Level 3 Features**
  - API access
  - Custom integrations
  - Advanced automation
  - Dedicated support

#### 5. Monitoring and Review

- Regular trust score updates
- Automated level progression
- Manual review triggers
- Performance monitoring
- Compliance checks

#### 6. Risk Management

- Fraud detection
- Suspicious activity monitoring
- Automated risk assessment
- Level demotion triggers
- Account suspension criteria

### Using Tenant Context in New Code

When developing new features, ensure proper tenant isolation by following these patterns:

#### In API Endpoints

```python
@router.post("/some-endpoint")
async def create_something_endpoint(
    data_in: SomeSchema,
    request: Request,  # Include request for tenant context
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
):
    # Pass request to service functions for tenant context
    result = create_something(db, data_in, request)
    return result
```

#### In Service Functions

```python
def create_something(db: Session, data_in: SomeSchema, request: Request = None) -> Model:
    # Convert data
    data = data_in.model_dump()

    # Get tenant ID from request context if not already set
    if request and not data.get('tenant_id'):
        tenant_id = get_tenant_id_from_request(request)
        if tenant_id:
            data['tenant_id'] = tenant_id

    # Create model with tenant ID included
    new_item = Model(**data)
    db.add(new_item)
    db.commit()
    return new_item
```

### Testing Tenant Isolation

Integration tests in `tests/integration/test_tenant_rls.py` demonstrate how to test tenant isolation:

```python
# Set tenant context for first tenant
set_tenant_id(db, str(tenant1_id))

# Should only see tenant 1's data
products = db.query(Product).all()
assert len(products) == 1
assert products[0].tenant_id == tenant1_id

# Switch to tenant 2 context
set_tenant_id(db, str(tenant2_id))

# Should only see tenant 2's data
products = db.query(Product).all()
assert len(products) == 1
assert products[0].tenant_id == tenant2_id
```

## 🛠️ Development Setup

### Prerequisites
- Python 3.10+
- PostgreSQL 15+
- Virtualenv or similar

### Installation

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env

# Run database migrations
alembic upgrade head
```

### Environment Variables

Required environment variables in `.env`:
```
DATABASE_URL=postgresql://user:password@localhost/dbname
PROJECT_NAME=Conversational Commerce
ENVIRONMENT=development
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

### Running the Application

```bash
# Start the development server
uvicorn app.main:app --reload

# Run tests
pytest

# Run linting
flake8
```

## 📚 API Documentation

Once the application is running, you can access:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/api/v1/openapi.json`

### 🔍 Real-Time Monitoring System

The platform implements a comprehensive real-time monitoring system to track activities, detect anomalies, and maintain system security.

#### 1. Activity Tracking

- **Activity Tracker Middleware**
  - Tracks all API requests and responses
  - Records user actions, resource access, and system events
  - Captures detailed metadata for each activity
  - Stores activities in the audit log

- **Activity Types**
  - User authentication
  - Resource creation/modification/deletion
  - API calls
  - System events
  - Security events

#### 2. Rules Engine

- **Rule Management**
  - Create, update, and delete monitoring rules
  - Define conditions based on activity patterns
  - Set severity levels (LOW, MEDIUM, HIGH, CRITICAL)
  - Enable/disable rules per tenant

- **Rule Conditions**
  - Field-based conditions
  - Time-based conditions
  - Pattern matching
  - Threshold monitoring
  - Custom operators

- **Rule Evaluation**
  - Real-time evaluation of activities
  - Historical data analysis
  - Cooldown periods to prevent alert fatigue
  - Severity-based notification channels

#### 3. WebSocket Service

- **Real-time Updates**
  - WebSocket connections for live monitoring
  - Tenant-specific channels
  - Activity broadcasting
  - Connection management

- **Connection Features**
  - Automatic reconnection
  - Heartbeat mechanism
  - Connection state management
  - Error handling

### 🔔 Notification System

The platform provides a multi-channel notification system to keep users informed about important events and alerts.

#### 1. Notification Channels

- **In-App Notifications**
  - Real-time WebSocket delivery
  - Priority-based styling
  - Interactive notifications
  - Mark as read functionality

- **Email Notifications**
  - HTML and plain text support
  - Priority-based subject lines
  - Detailed message formatting
  - Tenant-specific email templates

- **SMS Notifications**
  - Twilio integration
  - Priority-based delivery
  - Concise message formatting
  - Delivery status tracking

#### 2. Notification Features

- **Priority Levels**
  - URGENT (red)
  - HIGH (orange)
  - MEDIUM (blue)
  - LOW (green)

- **Notification Management**
  - Mark as read/unread
  - Delete notifications
  - Filter by priority
  - Search functionality

- **Notification Center**
  - Real-time updates
  - Unread count badge
  - Priority indicators
  - Detailed view with metadata

#### 3. Integration with Rules Engine

- **Automatic Notifications**
  - Rule-triggered alerts
  - Severity-based channel selection
  - Cooldown periods
  - Detailed context in messages

- **Notification Templates**
  - Rule-specific templates
  - Dynamic content insertion
  - Multi-language support
  - Tenant customization

### 🛡️ Security Features

The platform implements several security features to protect tenant data and system integrity.

#### 1. Rate Limiting

- **Per-Tenant Limits**
  - Requests per minute
  - Requests per hour
  - Requests per day
  - Custom limits per tenant

- **Rate Limit Headers**
  - Remaining requests
  - Reset times
  - Limit information

#### 2. Resource Quotas

- **Storage Limits**
  - Per-tenant storage quotas
  - Usage tracking
  - Automatic cleanup

- **API Usage**
  - Call limits
  - Usage tracking
  - Quota enforcement

#### 3. Activity Monitoring

- **Suspicious Activity Detection**
  - Pattern recognition
  - Anomaly detection
  - Automated alerts
  - Response actions

- **Audit Logging**
  - Comprehensive activity tracking
  - User action logging
  - System event logging
  - Security event logging
