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

# Edit .env with your configuration values
# Required: DATABASE_URL, CLOUDINARY_URL, TWILIO_AUTH_TOKEN

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload
```

### Working with Migrations

#### Create New Migration

```bash
alembic revision --autogenerate -m "Description of changes"
```

#### Apply Migrations

```bash
alembic upgrade head
```

## 🧪 Testing

### Unit Tests

```bash
pytest tests/unit
```

### Integration Tests

```bash
pytest tests/integration
```

### End-to-End Tests

```bash
pytest tests/e2e
```

### Test Tenant Isolation

```bash
pytest tests/integration/test_tenant_rls.py
```

## 📝 API Documentation

When running the development server, API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
