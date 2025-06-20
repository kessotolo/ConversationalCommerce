# Order Lifecycle & Event-Driven Architecture

## 🔄 Order Status Lifecycle & State Machine

The order system uses a well-defined state machine for status transitions with these rules:

```
PENDING → PAID, CANCELLED
PAID → PROCESSING, CANCELLED, REFUNDED
PROCESSING → SHIPPED, CANCELLED
SHIPPED → DELIVERED, RETURNED
DELIVERED → RETURNED
```

Terminal states (CANCELLED, REFUNDED, RETURNED) can only transition to themselves (idempotent operations).

All order status updates are centralized through the `_update_order_status` method in OrderService, which enforces:

1. **Valid Transitions**: Ensures that only permitted state transitions occur
2. **Event Emission**: Emits appropriate domain events for each transition
3. **Optimistic Locking**: Uses version-based concurrency control to prevent conflicts
4. **Audit Logging**: Creates detailed audit logs for all status changes
5. **Special Validations**: Enforces required data for specific statuses (e.g., tracking info for SHIPPED)

## Implementation Guidelines

### Status Update Rules

Developers must NEVER directly modify `order.status` and should ALWAYS use the OrderService update methods to ensure proper event emission and validation:

```python
# ❌ INCORRECT: Direct status assignment
order.status = OrderStatus.PAID.value  # This bypasses events and validation!

# ✅ CORRECT: Using the service method
updated_order = await order_service._update_order_status(
    order,
    new_status=OrderStatus.PAID,
    payment_reference="TX123456"
)
```

### Event Emission in Order Lifecycle

Each status transition emits appropriate events:

1. **Generic Event (All Transitions)**

   - `OrderStatusChangedEvent` with before/after status

2. **Specialized Events (Key Transitions)**
   - PENDING → PAID: `PaymentProcessedEvent`
   - Any → CANCELLED: `OrderCancelledEvent`
   - PROCESSING → SHIPPED: `OrderShippedEvent`
   - SHIPPED → DELIVERED: `OrderDeliveredEvent`

### Error Handling & Validation

- Invalid transitions raise `OrderValidationError`
- Missing required data raises `OrderValidationError` (e.g., tracking info for SHIPPED status)
- Concurrent modification handled with optimistic locking and retries

### Integration Points

#### Event Handlers

The following handlers process order events:

- `NotificationHandler`: Sends order status notifications to customers
- `AnalyticsHandler`: Logs order events for analytics
- `InventoryHandler`: Updates inventory levels based on order status

#### Service Integration

Services that manage order status should use the OrderService methods:

- `PaymentService`: When processing payments
- `FulfillmentService`: When marking orders as shipped/delivered
- `CustomerService`: When handling returns/cancellations

## For Contributors

When extending the order system:

1. Use the centralized `_update_order_status` method for all status transitions
2. Add new event types to `OrderEventFactory` when adding new statuses or transitions
3. Register new handlers with the EventBus for additional functionality
4. Add audit logging for any state-changing operations
5. Add tests for new transitions and event handlers
