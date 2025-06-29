# Backend Architecture

## 🚀 Backend Modernization & Core Principles

- All business logic is centralized in class-based service layers
- API handlers are thin: they pass DTOs/business objects to service methods, not raw primitives
- All database access is fully async, using `AsyncSession` and `async with db.begin()` for transactions
- Tenant isolation is enforced at the DB level using PostgreSQL Row-Level Security (RLS)
- Optimistic locking (version checks) prevents data corruption in concurrent environments

## Service Layer Pattern

The backend follows the service layer pattern:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│    API      │      │  Service    │      │ Repository  │      │  Database   │
│  Endpoint   │─────▶│   Layer     │─────▶│   Layer     │─────▶│    (ORM)    │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
      │                     │                                        ▲
      │                     │                                        │
      │                     ▼                                        │
      │              ┌─────────────┐                                 │
      └─────────────▶│   Domain    │─────────────────────────────────┘
                     │   Models    │
                     └─────────────┘
```

### Key Components

1. **API Endpoints**: HTTP interface, validation, serialization
2. **Service Layer**: Business logic, transactions, validation
3. **Repository Layer**: Data access abstractions
4. **Domain Models**: Core business entities

## Error Handling Architecture

The backend implements a consistent error handling approach:

1. **Custom Exception Hierarchy**: Domain-specific exceptions (e.g., `OrderNotFoundError`)
2. **Error Handler Decorator**: Maps service exceptions to HTTP responses
3. **Centralized Mapping**: Consistent error responses across endpoints
4. **Validation Pipeline**: Request validation before business logic

Example:
```python
@router.put("/{order_id}/status", response_model=OrderResponse)
@handle_service_errors
async def update_order_status(
    order_id: UUID,
    status_update: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an order's status."""
    order_service = OrderService(db)
    updated_order = await order_service.update_order_status(
        order_id=order_id,
        status=status_update.status,
        version=status_update.version,
        user_id=current_user.id,
    )
    return updated_order
```

## 🛡️ Optimistic Locking

Optimistic locking is implemented to prevent lost updates:

- Version fields on models track modifications
- Version checks on updates prevent concurrent conflicts
- `409 Conflict` responses for version mismatch

Implementation:
```python
async def update_order_status(self, order_id: UUID, status: str, version: int, user_id: UUID) -> Order:
    """Update an order's status with optimistic locking."""
    order = await self.get_order(order_id)
    
    if order.version != version:
        raise OptimisticLockError(f"Order has been modified (current version: {order.version})")
    
    order.status = status
    order.updated_by = user_id
    order.version += 1
    
    await self.db.commit()
    return order
```

## 🏢 Tenant Context Propagation

Tenant isolation is enforced at multiple levels:

1. **Middleware**: Sets tenant context from subdomain/header
2. **Database Session**: Propagates tenant ID to PostgreSQL
3. **Row-Level Security (RLS)**: Filters rows based on tenant ID

Implementation:
```python
class TenantMiddleware:
    async def __call__(self, request: Request, call_next):
        tenant_id = self._extract_tenant_id(request)
        request.state.tenant_id = tenant_id
        
        # Set RLS context in database session
        connection = request.app.state.db_connection
        await connection.execute(f"SET LOCAL my.tenant_id = '{tenant_id}'")
        
        response = await call_next(request)
        return response
```

## Async Database Access

All database operations use async patterns:

```python
async def create_product(self, product_data: ProductCreate) -> Product:
    """Create a new product."""
    async with self.db.begin():
        product = Product(**product_data.dict())
        self.db.add(product)
        await self.db.flush()
        return product
```

## Event-Driven Architecture

The backend uses events for loosely coupled components:

1. **Event Publishing**: Domain events emitted after state changes
2. **Event Handlers**: Async handlers for event processing
3. **Event Store**: Persistent record of all domain events

```python
async def create_order(self, order_data: OrderCreate) -> Order:
    """Create a new order."""
    async with self.db.begin():
        # Create order...
        
        # Publish event
        await self.event_publisher.publish(
            OrderCreatedEvent(
                order_id=order.id,
                customer_id=order.customer_id,
                total_amount=order.total_amount,
                status=order.status,
            )
        )
        
        return order
```

## Testing Architecture

The testing approach ensures proper tenant isolation and async operation:

1. **Test Fixtures**: Provide isolated tenant context
2. **Async Tests**: Use async fixtures and test cases
3. **Transaction Rollbacks**: Tests run in transactions

```python
@pytest.fixture
async def test_tenant():
    """Provide a test tenant context."""
    tenant_id = uuid.uuid4()
    connection = await get_test_connection()
    await connection.execute(f"SET LOCAL my.tenant_id = '{tenant_id}'")
    yield tenant_id
    await connection.execute("RESET my.tenant_id")
```
