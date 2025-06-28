# Known Issues & Troubleshooting Guide

## Overview

This document outlines common issues, edge cases, and known limitations in the Conversational Commerce platform, along with troubleshooting steps and workarounds. It serves as a reference for developers and operations teams when encountering expected challenges.

## Schema Version Mismatch

### Symptoms

- API returns 500 errors with database schema-related messages
- Application logs show `SQLAlchemyError` with column or relation not found
- Inconsistent behavior between environments

### Causes

- Missing or incomplete database migrations
- Migration scripts applied out of order
- Multiple application versions accessing the same database

### Resolution

1. Verify current schema version:

```bash
alembic current
```

2. Check for unapplied migrations:

```bash
alembic history --indicate-current
```

3. Apply missing migrations:

```bash
alembic upgrade head
```

4. For development environments, consider resetting:

```bash
alembic downgrade base
alembic upgrade head
```

## Webhook Retry Delays

### Symptoms

- Payment confirmations delayed
- Duplicate webhook processing logs
- Inconsistent payment status between provider and platform

### Causes

- Network issues between payment provider and platform
- Webhook endpoint temporarily unavailable
- Payment provider retry logic kicking in

### Resolution

1. Check webhook logs for receipt and processing status
2. Verify idempotency key handling is working correctly
3. Manually check payment status via provider dashboard
4. Use the admin dashboard to force payment status refresh:

```
Admin Panel > Payments > View > Refresh Status
```

5. Configure appropriate webhook retry windows:

```python
# In payment provider settings
WEBHOOK_RETRY_WINDOW_MINUTES = 60  # Ignore retries after this window
```

## Chat-Specific Edge Cases

### WhatsApp Message Ordering

#### Symptoms

- Messages appear out of order in chat history
- Responses seem disconnected from customer queries
- Duplicate messages in conversation

#### Causes

- WhatsApp message delivery delays
- Clock skew between WhatsApp servers and platform
- Parallel message processing paths

#### Resolution

1. Use message timestamps for ordering:

```python
messages = sorted(messages, key=lambda m: m.timestamp)
```

2. Implement idempotency for webhook handling
3. Add a small delay before responding to ensure all messages are received

### Conversation Context Loss

#### Symptoms

- Bot fails to remember previous interactions
- Customer needs to repeat information
- Inconsistent personalization

#### Causes

- Session timeout too short
- Context window limitations
- Missing conversation history in requests

#### Resolution

1. Increase session timeout:

```python
# In settings.py
CONVERSATION_SESSION_TIMEOUT_MINUTES = 60  # Extend from default 30
```

2. Implement context persistence to database
3. Add robust error handling for context retrieval failures

## Payment Integration Issues

### M-Pesa Timeout Errors

#### Symptoms

- Payments stuck in "pending" status
- STK push received but callback never arrives
- Timeout errors in payment logs

#### Causes

- Network connectivity issues to M-Pesa API
- Customer did not complete STK prompt in time
- M-Pesa service disruption

#### Resolution

1. Implement status checking job:

```python
@app.task(bind=True, max_retries=5)
def check_mpesa_transaction_status(self, payment_id):
    payment = PaymentService.get_payment(payment_id)
    if payment.status == PaymentStatus.PENDING:
        status = mpesa_provider.check_transaction_status(payment.reference)
        if status in ["COMPLETED", "FAILED"]:
            PaymentService.update_payment_status(payment_id, status)
```

2. Add automated retry with exponential backoff
3. Provide manual verification option for admins

### Paystack Webhook Signature Failures

#### Symptoms

- Webhook requests rejected with 400 errors
- Signature verification errors in logs
- Payments confirmed in Paystack but not in platform

#### Causes

- Misconfigured webhook secret
- Clock skew affecting signature validation
- HTTPS proxy modifying request headers

#### Resolution

1. Verify webhook secret in environment variables
2. Implement more tolerant signature validation:

```python
def verify_webhook_signature(payload, signature, secret):
    computed = hmac.new(
        secret.encode(),
        payload.encode(),
        digestmod=hashlib.sha512
    ).hexdigest()

    # Allow for slight time variations
    return hmac.compare_digest(computed, signature) or \
           any(hmac.compare_digest(s, signature) for s in generate_time_varied_signatures(payload, secret))
```

3. Add comprehensive logging around signature verification steps

## Database Connection Issues

### Connection Pool Exhaustion

#### Symptoms

- API response times increasing
- 500 errors with "timeout waiting for connection"
- Database connection count near max_connections limit

#### Causes

- Connection leaks in application code
- Inadequate connection pool configuration
- Long-running transactions not releasing connections

#### Resolution

1. Verify proper connection handling:

```python
async def get_items():
    async with db.session() as session:  # Ensure connection released
        result = await session.execute(query)
        return result.scalars().all()
```

2. Configure connection pool appropriately:

```python
# In database.py
engine = create_async_engine(
    DATABASE_URI,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,
)
```

3. Monitor connection usage with metrics:

```python
# Add to Prometheus metrics
db_connections_used = Gauge(
    'db_connections_used',
    'Database connections currently in use'
)
```

## Cache Inconsistency

### Symptoms

- Outdated data served to users
- Inconsistent behavior between requests
- Updates not immediately visible

### Causes

- Cache invalidation failures
- Race conditions in update operations
- Improper cache key generation

### Resolution

1. Implement version-based cache keys:

```python
def get_cache_key(resource_type, resource_id):
    return f"{resource_type}:{resource_id}:v{get_resource_version(resource_type, resource_id)}"
```

2. Add cache headers for proper client-side caching:

```python
@router.get("/orders/{order_id}")
async def get_order(order_id: int, response: Response):
    order = await order_service.get_order(order_id)
    etag = f"W/\"{order.version}\""
    response.headers["ETag"] = etag
    return order
```

3. Use cache invalidation on write operations:

```python
async def update_order(order_id, data):
    # Update order
    updated_order = await order_service.update_order(order_id, data)
    # Invalidate cache
    await cache.delete(f"order:{order_id}")
    return updated_order
```

## Performance Troubleshooting

### Slow API Responses

#### Symptoms

- API response times exceed 500ms
- Timeouts in dependent services
- Increasing error rates during peak traffic

#### Causes

- N+1 query patterns
- Missing database indexes
- Inefficient query patterns

#### Resolution

1. Use query optimization techniques:

```python
# Before: N+1 queries
orders = await db.execute(select(Order).where(Order.tenant_id == tenant_id))
for order in orders:
    # This causes N additional queries
    items = await db.execute(select(OrderItem).where(OrderItem.order_id == order.id))

# After: Single query with joins
query = select(Order).options(
    selectinload(Order.items)
).where(Order.tenant_id == tenant_id)
orders = await db.execute(query)
```

2. Add appropriate indexes:

```python
# In a migration
op.create_index('ix_orders_tenant_id_created_at', 'orders', ['tenant_id', 'created_at'], schema='commerce')
```

3. Implement caching for read-heavy operations:

```python
@cached(ttl=300)  # 5 minute cache
async def get_tenant_sales_summary(tenant_id: int):
    # Expensive calculation...
    return summary
```

## Monitoring and Observability Issues

### Missing or Incomplete Logs

#### Symptoms

- Difficulty troubleshooting production issues
- Gaps in log sequences
- Missing context in error reports

#### Resolution

1. Implement structured logging:

```python
logger.info("Processing payment", extra={
    "payment_id": payment.id,
    "amount": payment.amount,
    "provider": payment.provider,
    "request_id": request_id
})
```

2. Add correlation IDs across service boundaries:

```python
@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
    request.state.correlation_id = correlation_id
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = correlation_id
    return response
```

3. Configure appropriate log levels:

```python
# Production settings
logging.getLogger("app").setLevel(logging.INFO)
logging.getLogger("app.payments").setLevel(logging.DEBUG)  # More verbose for critical components
```
