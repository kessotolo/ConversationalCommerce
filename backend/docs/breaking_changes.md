# Breaking Changes & Migration Guide

## v2.0.0 (Upcoming)

### Major Changes

#### 1. Order Status Management

- **Change**: Centralized order status updates through `_update_order_status`
- **Impact**: Direct status updates will be blocked
- **Migration**:

  ```python
  # Old way (no longer works)
  order.status = "processing"
  await db.commit()

  # New way
  await order_service._update_order_status(
      order_id=order.id,
      new_status=OrderStatus.PROCESSING,
      actor_id=current_user.id,
      notes="Started processing"
  )
  ```

#### 2. Event System Integration

- **Change**: All order modifications now emit events
- **Impact**: Side effects must be moved to event handlers
- **Migration**:

  ```python
  # Old way (direct side effects)
  async def process_order(order_id):
      order = await get_order(order_id)
      await send_email(order.user.email, "Order Confirmation")
      await update_inventory(order.items)

  # New way (event-driven)
  async def process_order(order_id):
      await order_service._update_order_status(
          order_id=order_id,
          new_status=OrderStatus.PROCESSING
      )
      # Handlers for OrderStatusChangedEvent will handle email/inventory
  ```

### Database Migrations

#### 1. UUID Standardization

- **Change**: String UUIDs → Native PostgreSQL UUIDs
- **Impact**: Required schema migration for all tables
- **Migration Script**:
  ```sql
  -- For each table with String UUIDs
  ALTER TABLE orders ALTER COLUMN id TYPE UUID USING id::UUID;
  ALTER TABLE order_items ALTER COLUMN order_id TYPE UUID USING order_id::UUID;
  ```

### API Changes

#### 1. New Required Fields

- **Endpoint**: `POST /api/v1/orders`
- **Change**: `channel` field is now required
- **Old Request**:
  ```json
  {
    "product_id": "123",
    "quantity": 1
  }
  ```
- **New Request**:
  ```json
  {
    "product_id": "123",
    "quantity": 1,
    "channel": "web"
  }
  ```

## v1.0.0 (Current)

### Initial Release

- Base order management
- Basic payment integration
- Multi-tenant support

## Deprecation Notices

### Pending Deprecation

1. **Legacy Endpoints**

   - `/api/legacy/orders` → Use `/api/v1/orders`
   - Will be removed in v3.0.0

2. **Direct Status Updates**
   - Direct assignment to `order.status`
   - Will be blocked in v2.0.0

## Migration Checklist

### Before Upgrading to v2.0.0

- [ ] Update all direct status updates to use `_update_order_status`
- [ ] Move side effects to event handlers
- [ ] Test with `STRICT_MODE=true` to catch deprecated patterns
- [ ] Run database migrations in staging first
- [ ] Update API clients to include required fields

## Feature Flags

### Available Flags

```env
# Enable new checkout flow
ENABLE_V2_CHECKOUT=true

# Enable strict validation
STRICT_MODE=false

# Enable new payment providers
ENABLE_MPESA=true
ENABLE_PAYSTACK=true
```

### Usage

```python
from app.config import settings

if settings.ENABLE_V2_CHECKOUT:
    # Use new checkout
else:
    # Fallback to legacy
```

## Testing Upgrades

### Unit Tests

```bash
# Test with strict mode
STRICT_MODE=true pytest tests/

# Test with feature flags
ENABLE_V2_CHECKOUT=true pytest tests/
```

### Integration Tests

```bash
# Test database migrations
pytest tests/integration/test_migrations.py

# Test API compatibility
pytest tests/api/v1/
```

## Rollback Procedure

### Database Rollback

1. Restore from backup
2. Run previous migration:
   ```bash
   alembic downgrade -1
   ```

### Code Rollback

1. Checkout previous tag:
   ```bash
   git checkout v1.0.0
   ```
2. Rebuild and restart services

## Support

For assistance with migrations, contact:

- **Slack**: #engineering-support
- **Email**: support@example.com
- **On-call**: +1-555-123-4567

## Known Issues

### v2.0.0

1. **Webhook Retries**

   - Some webhook retries may fail during high load
   - Workaround: Implement idempotency keys
   - Fix scheduled for v2.0.1

2. **Migration Performance**
   - Large databases may experience downtime during UUID migration
   - Workaround: Run migration during maintenance window

## Upgrade Timeline

### v1.0.0 → v2.0.0

1. **2025-07-01**: Beta release available
2. **2025-07-15**: RC1 with migration tools
3. **2025-08-01**: GA release
4. **2025-09-01**: v1.0.0 EOL

## Breaking Changes Policy

### Versioning

- **MAJOR**: Breaking changes
- **MINOR**: Backwards-compatible features
- **PATCH**: Backwards-compatible bug fixes

### Support Window

- Current MAJOR version + 1 previous MAJOR version
- Critical security fixes for all supported versions
- 3 months deprecation notice for breaking changes
