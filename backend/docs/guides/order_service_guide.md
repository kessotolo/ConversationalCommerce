# OrderService Usage Guide

## Overview

The `OrderService` is the centralized component for all order-related business logic in the Conversational Commerce platform. This guide provides comprehensive information on how to use the OrderService correctly, common patterns, and best practices.

## Core Principles

The OrderService follows these core design principles:

1. **Centralized Logic**: All order-related business logic resides in the service
2. **Thin Controllers**: API endpoints delegate to service methods
3. **Event-Driven**: Status changes emit events for side effects
4. **Optimistic Locking**: Prevents concurrent update conflicts
5. **Audit Trail**: Creates detailed audit logs for all operations

## Common Operations

### Creating an Order

```python
async def create_order(db: AsyncSession, order_data: OrderCreate) -> Order:
    order_service = OrderService(db)
    return await order_service.create_order(order_data)
```

### Updating Order Status

Always use the centralized `_update_order_status` method to ensure proper validation, event emission, and audit logging:

```python
# ❌ INCORRECT: Direct status assignment
order.status = OrderStatus.PAID.value  # Bypasses events and validation!

# ✅ CORRECT: Using the service method
updated_order = await order_service._update_order_status(
    db,
    order,
    new_status=OrderStatus.PAID,
    payment_reference="TX123456"
)
```

### Retrieving Orders

```python
# Get a single order
order = await order_service.get_order_by_id(order_id)

# Get multiple orders with filtering
orders = await order_service.get_orders(
    tenant_id=1,
    status=OrderStatus.PROCESSING,
    skip=0,
    limit=100
)
```

### Cancelling an Order

```python
cancelled_order = await order_service._update_order_status(
    db,
    order,
    new_status=OrderStatus.CANCELLED,
    cancellation_reason="Customer request"
)
```

## Error Handling

The OrderService uses a custom exception hierarchy to provide clear error messages:

- `OrderNotFoundError`: Order with specified ID doesn't exist
- `InvalidOrderStatusError`: Attempted invalid status transition
- `OrderValidationError`: Order data validation failed
- `ConcurrentUpdateError`: Another process updated the order (version mismatch)

Example error handling:

```python
try:
    order = await order_service._update_order_status(db, order, OrderStatus.SHIPPED)
except InvalidOrderStatusError as e:
    # Handle invalid status transition
    logger.error(f"Invalid status transition: {str(e)}")
    raise HTTPException(status_code=400, detail=str(e))
except ConcurrentUpdateError as e:
    # Handle concurrent update conflict
    logger.warning(f"Concurrent update detected: {str(e)}")
    raise HTTPException(status_code=409, detail="Order was modified by another process")
except Exception as e:
    # Handle other errors
    logger.error(f"Error updating order: {str(e)}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

## Transaction Management

The OrderService manages transactions to ensure atomicity:

```python
async with db.begin():
    # Multiple operations within a transaction
    order = await order_service.get_order_by_id(order_id)
    updated_order = await order_service._update_order_status(db, order, OrderStatus.PAID)
    await payment_service.record_payment(order_id, amount)
```

## Optimistic Locking

The OrderService uses version-based optimistic locking to prevent conflicts during concurrent updates:

```python
# Version check happens inside _update_order_status
updated_order = await order_service._update_order_status(
    db,
    order,
    new_status=OrderStatus.PROCESSING
)
```

If the order was updated by another process since it was retrieved, a `ConcurrentUpdateError` will be raised.

## Audit Logging

Every operation on orders creates an audit log entry:

```python
# This happens automatically in the service methods
create_audit_log(
    db=db,
    user_id=user_id,
    action=AuditActionType.UPDATE,
    resource_type=AuditResourceType.ORDER,
    resource_id=order.id,
    details={
        "old_status": old_status,
        "new_status": new_status,
        "reason": reason
    }
)
```

## Event Emission

The OrderService emits domain events for all significant operations:

```python
# This happens automatically in _update_order_status
event = OrderEventFactory.create_status_changed_event(
    order,
    old_status=old_status,
    new_status=new_status
)
await get_event_bus().publish(event)
```

## Best Practices

1. **Never modify order status directly** - Always use `_update_order_status`
2. **Handle optimistic locking errors** - Implement retry logic for concurrent updates
3. **Include idempotency keys** - For operations that might be retried
4. **Use transactions** - For operations that update multiple entities
5. **Validate input data** - Before passing to service methods
6. **Log meaningful errors** - Include order ID and operation context
7. **Subscribe to relevant events** - Rather than adding direct coupling

## Common Pitfalls

1. **Direct status updates** - Bypassing `_update_order_status` breaks the event system
2. **Ignoring version conflicts** - Not handling optimistic locking leads to lost updates
3. **Manual transaction management** - Let the service handle transactions
4. **Missing error handling** - Always handle service exceptions
5. **Large transaction scope** - Keep transactions focused and short-lived

## Integration with Other Services

The OrderService integrates with:

- **PaymentService**: For payment processing and verification
- **InventoryService**: Through event handlers for stock updates
- **NotificationService**: Through event handlers for customer notifications
- **AnalyticsService**: Through event handlers for business intelligence

Always use events for integration rather than direct service coupling when possible.
