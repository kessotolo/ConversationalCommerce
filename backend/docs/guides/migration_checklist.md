# Data Migration & Upgrade Checklist

## Overview

This document provides a comprehensive checklist for planning and executing data migrations and API version upgrades in the Conversational Commerce platform. It outlines the steps, considerations, and best practices for both developers and operators.

## Database Migration Checklist

### Pre-Migration Planning

- [ ] **Schema Change Analysis**

  - [ ] Identify all tables and fields affected by migration
  - [ ] Document current vs. new schema differences
  - [ ] Estimate data volume for affected tables

- [ ] **Impact Assessment**

  - [ ] Identify dependent services/components
  - [ ] Assess transaction volume during migration window
  - [ ] Determine acceptable downtime (if any)

- [ ] **Rollback Strategy**

  - [ ] Create full database backup before migration
  - [ ] Prepare rollback scripts for each migration step
  - [ ] Define rollback decision criteria and responsible parties

- [ ] **Testing Strategy**
  - [ ] Create migration test plan with representative data
  - [ ] Set up staging environment that mirrors production
  - [ ] Prepare test cases for data integrity verification

### Migration Script Development

- [ ] **Alembic Migration Scripts**
  - [ ] Create separate scripts for schema changes vs. data migration
  - [ ] Include transaction boundaries for atomic operations
  - [ ] Add appropriate indexes before bulk data operations
  - [ ] Implement validation checks within migration scripts

```python
# Example migration script structure
"""Add channel_metadata table and migrate existing data

Revision ID: a1b2c3d4e5f6
Revises: previous_revision_id
Create Date: 2023-06-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers
revision = 'a1b2c3d4e5f6'
down_revision = 'previous_revision_id'
branch_labels = None
depends_on = None


def upgrade():
    # Create new tables/columns
    op.create_table(
        'channel_metadata',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('channel_type', sa.String(), nullable=False),
        sa.Column('entity_type', sa.String(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        schema='commerce'
    )

    # Migrate existing data
    connection = op.get_bind()

    # Example: Migrating WhatsApp data from order.metadata to channel_metadata
    orders = connection.execute(
        """
        SELECT id, metadata, tenant_id
        FROM commerce.orders
        WHERE metadata->>'channel' = 'whatsapp'
          AND metadata->>'wa_phone' IS NOT NULL
        """
    )

    for order in orders:
        if 'wa_phone' in order.metadata:
            connection.execute(
                """
                INSERT INTO commerce.channel_metadata
                (channel_type, entity_type, entity_id, created_at, updated_at)
                VALUES ('whatsapp', 'order', :order_id, now(), now())
                RETURNING id
                """,
                {"order_id": order.id}
            )

            metadata_id = connection.execute(
                "SELECT lastval() as id"
            ).scalar()

            connection.execute(
                """
                INSERT INTO commerce.whatsapp_order_metadata
                (id, wa_phone, wa_message_id, wa_business_account_id, wa_context)
                VALUES (:id, :phone, :message_id, :account_id, :context)
                """,
                {
                    "id": metadata_id,
                    "phone": order.metadata.get('wa_phone'),
                    "message_id": order.metadata.get('wa_message_id'),
                    "account_id": order.metadata.get('wa_business_account_id'),
                    "context": order.metadata.get('wa_context', {})
                }
            )

def downgrade():
    # Revert data migration first
    connection = op.get_bind()

    # Example: Migrate data back to orders.metadata
    whatsapp_metadata = connection.execute(
        """
        SELECT cm.entity_id as order_id, wm.wa_phone, wm.wa_message_id,
               wm.wa_business_account_id, wm.wa_context
        FROM commerce.channel_metadata cm
        JOIN commerce.whatsapp_order_metadata wm ON cm.id = wm.id
        WHERE cm.channel_type = 'whatsapp'
          AND cm.entity_type = 'order'
        """
    )

    for wm in whatsapp_metadata:
        connection.execute(
            """
            UPDATE commerce.orders
            SET metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{wa_phone}',
                to_jsonb(:phone)
            )
            WHERE id = :order_id
            """,
            {"order_id": wm.order_id, "phone": wm.wa_phone}
        )
        # Continue setting other fields...

    # Drop tables in reverse order
    op.drop_table('whatsapp_order_metadata', schema='commerce')
    op.drop_table('channel_metadata', schema='commerce')
```

- [ ] **Performance Optimization**
  - [ ] Use batch processing for large data sets
  - [ ] Consider temporary indexes for migration performance
  - [ ] Implement progress tracking for long-running migrations

### Migration Execution

- [ ] **Pre-Execution Verification**

  - [ ] Run migration on clone of production data
  - [ ] Verify execution time on representative data volume
  - [ ] Confirm all tests pass with migrated data

- [ ] **Execution Plan**

  - [ ] Schedule migration during low-traffic window
  - [ ] Notify all stakeholders of maintenance window
  - [ ] Prepare monitoring dashboards for migration tracking

- [ ] **Deployment Steps**

  - [ ] Deploy code compatible with both old and new schema
  - [ ] Execute schema migrations (`alembic upgrade head`)
  - [ ] Verify data integrity post-migration
  - [ ] Run automated tests against new schema

- [ ] **Post-Migration Verification**
  - [ ] Validate data integrity with spot checks
  - [ ] Monitor application performance with new schema
  - [ ] Verify all dependent services are functioning

## API Version Migration

### Breaking Changes Assessment

- [ ] **API Contract Changes**

  - [ ] Document all changed request/response schemas
  - [ ] Identify removed endpoints or parameters
  - [ ] List behavior changes that affect clients

- [ ] **Compatibility Layer**
  - [ ] Implement request/response transformers where needed
  - [ ] Add deprecation warnings for old endpoints
  - [ ] Ensure error responses remain compatible

### API Versioning Implementation

- [ ] **Version Routing**
  - [ ] Implement path-based versioning (`/api/v2/...`)
  - [ ] Update API documentation to reflect versioning
  - [ ] Configure OpenAPI schemas for each version

```python
# Example API version routing
from fastapi import APIRouter, FastAPI

app = FastAPI(title="Conversational Commerce API")

# V1 routes (existing)
v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(orders_v1_router, prefix="/orders", tags=["orders"])
v1_router.include_router(payments_v1_router, prefix="/payments", tags=["payments"])
app.include_router(v1_router)

# V2 routes (new)
v2_router = APIRouter(prefix="/api/v2")
v2_router.include_router(orders_v2_router, prefix="/orders", tags=["orders"])
v2_router.include_router(payments_v2_router, prefix="/payments", tags=["payments"])
app.include_router(v2_router)
```

- [ ] **Feature Flags**
  - [ ] Implement feature flags for gradual rollout
  - [ ] Add store/tenant-specific opt-in mechanism
  - [ ] Create admin controls for enabling features

```python
# Example feature flag implementation
from app.core.config import settings

def is_feature_enabled(feature_name: str, tenant_id: int = None) -> bool:
    """Check if a feature is enabled globally or for specific tenant."""

    # Check global feature flags
    if feature_name in settings.ENABLED_FEATURES:
        return True

    # Check tenant-specific flags
    if tenant_id:
        tenant_settings = get_tenant_settings(tenant_id)
        if tenant_settings and feature_name in tenant_settings.enabled_features:
            return True

    return False

# Usage in endpoint
@router.post("/orders/")
async def create_order(order: OrderCreate, tenant_id: int):
    if is_feature_enabled("enhanced_order_validation", tenant_id):
        # Use new validation logic
        errors = await validate_order_enhanced(order)
    else:
        # Use legacy validation
        errors = validate_order_basic(order)
```

### Client Migration Strategy

- [ ] **Documentation Updates**

  - [ ] Create migration guide for API consumers
  - [ ] Document all breaking changes with examples
  - [ ] Provide example code for upgrading clients

- [ ] **Deprecation Timeline**

  - [ ] Announce deprecation schedule for old API version
  - [ ] Define support timeline for each API version
  - [ ] Implement monitoring for usage of deprecated endpoints

- [ ] **Client Communication**
  - [ ] Send notifications to all registered API consumers
  - [ ] Provide direct support channels for migration assistance
  - [ ] Create sandbox environment for testing new API version

## Backward Compatibility Guidelines

### Maintain Compatibility Where Possible

- [ ] **Request Handling**

  - [ ] Accept both old and new parameter formats
  - [ ] Support both camelCase and snake_case if format changed
  - [ ] Apply defaults for new required parameters

- [ ] **Response Handling**
  - [ ] Include both old and new fields in responses
  - [ ] Maintain consistent error response format
  - [ ] Add version info in response headers

```python
# Example backward compatibility in request handling
@router.post("/orders/")
async def create_order(order_data: Dict):
    # Handle both old and new formats
    if "customer_id" in order_data:
        # New format
        customer_id = order_data["customer_id"]
    elif "customerId" in order_data:
        # Old format
        customer_id = order_data["customerId"]
    elif "customer" in order_data and "id" in order_data["customer"]:
        # Another old format
        customer_id = order_data["customer"]["id"]
    else:
        customer_id = None

    # Continue processing...
```

### Phased Migration

- [ ] **Phase 1: New API Version Introduction**

  - [ ] Deploy new API version alongside existing version
  - [ ] Update documentation with migration guides
  - [ ] Begin notifying clients about future deprecation

- [ ] **Phase 2: Encourage Migration**

  - [ ] Add deprecation warnings in old API responses
  - [ ] Track usage metrics for old vs. new API
  - [ ] Provide incentives for early adopters of new API

- [ ] **Phase 3: Limited Support**

  - [ ] Freeze feature development on old API version
  - [ ] Focus support resources on migration assistance
  - [ ] Implement gradual performance throttling for old API

- [ ] **Phase 4: Deprecation**
  - [ ] Set fixed end-of-life date for old API
  - [ ] Provide final migration assistance
  - [ ] Plan decomissioning of old API code paths

## Testing Strategy

### Test Coverage

- [ ] **Migration Tests**

  - [ ] Unit tests for migration scripts
  - [ ] Integration tests with representative data
  - [ ] Performance tests for large data sets

- [ ] **API Compatibility Tests**

  - [ ] Test suite using old API client against new API
  - [ ] Verify behavior consistency across versions
  - [ ] Test with real-world client request patterns

- [ ] **Regression Tests**
  - [ ] End-to-end tests covering critical workflows
  - [ ] Load tests to ensure performance is maintained
  - [ ] Security tests for new API endpoints

### Monitoring During Migration

- [ ] **Key Metrics**

  - [ ] Error rates by endpoint and API version
  - [ ] Response times before and after migration
  - [ ] Database query performance for migrated schema
  - [ ] Client adoption rates for new API version

- [ ] **Alerting**
  - [ ] Set up alerts for migration-related errors
  - [ ] Monitor database performance during migration
  - [ ] Track failed API calls with version context
