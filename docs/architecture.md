## 🚀 Backend Modernization & Order Service Consolidation (2024-06)

- All order logic is now centralized in a class-based `OrderService`.
- API handlers are thin: they pass DTOs/business objects directly to service methods, not raw primitives.
- All business logic, validation, and DB access is in service classes, not endpoints.
- All database access is fully async, using `AsyncSession` and `async with db.begin()` for transactions.
- Optimistic locking (version checks) is enforced for all update/delete flows to prevent lost updates.
- Tenant isolation is enforced at the DB level using PostgreSQL Row-Level Security (RLS) and session variables.
- All legacy/duplicate order endpoints have been removed; `/api/v1/orders/` is the single source of truth.
- Request/response schemas remain backward compatible for clients.
- This architecture reduces boilerplate, improves maintainability, and ensures robust multi-tenant security.

## 🛠️ Order API & Service Refactor (2024-06)

- All business logic and validation for order operations is now centralized in the service layer (`order_service.py`).
- API endpoints are thin and focused on HTTP concerns, delegating all business logic to the service.
- A DRY error handler decorator is used on all order endpoints to map custom service exceptions to standardized HTTP responses.
- Transaction boundaries are managed by a `@transactional` decorator in the service layer, ensuring atomicity and rollback on error.
- A custom exception hierarchy (`OrderError`, `OrderNotFoundError`, `OrderValidationError`) is used for robust, expressive error handling in the service layer.
- Error-to-HTTP mapping is now centralized and consistent, improving maintainability and client experience.
- All tests and documentation have been updated to reflect these changes, and the codebase is now easier to extend and maintain for future contributors.
- All database migrations are managed using Alembic in the backend directory. See `backend/README.md` for workflow, troubleshooting, and best practices.
- WhatsApp-specific order metadata is now stored in a dedicated WhatsAppOrderDetails model, linked one-to-one with Order. This enables clean separation of concerns and makes it easy to add support for other conversational channels in the future. See backend/docs/api/orders.md for details.
- The order system uses an event-driven architecture. Events like OrderCreated, OrderStatusChanged, and OrderDelivered are emitted and handled asynchronously for notifications, analytics, and fulfillment. See backend/docs/api/orders.md for event types and details.
- Payment events (e.g., PaymentProcessedEvent) are now part of the event-driven order system. See backend/docs/api/orders.md for details.
- The event-driven order system is fully tested and observable. All event handlers are covered by a test suite, and observability (logging, metrics, alerting) is built in. See backend/docs/api/orders.md for details.

## 🛡️ Optimistic Locking for Data Integrity

- Optimistic locking is used for all order status updates and deletes to prevent lost updates and ensure data integrity in concurrent environments.
- The system uses a version field on models (e.g., Order) to detect concurrent modifications. If the version in the update request does not match the current version in the database, a `409 Conflict` error is returned and the update is rejected.
- **Contributor Guidance:**
  - Always include and check the version field in update and delete operations for models that support optimistic locking.
  - Extend optimistic locking to all update and patch flows, including order changes, refund requests, and any other critical state transitions.
  - For new models or flows, add a version field and implement version checks in service methods.
- See `OrderService.update_order_status` and related methods for reference implementation.

## 🏢 Tenant Context Propagation
- Tenant context is set by middleware (see TenantMiddleware and SubdomainMiddleware) and stored in request.state. The async DB session uses this context to set the PostgreSQL session variable (`SET LOCAL my.tenant_id`).
- All DB access is async and uses the tenant context for RLS enforcement. No business logic or endpoint should set tenant context directly.
- See backend/README.md for more on middleware and session management.

## 🧪 Testing and Tenant Context
- All tests that touch tenant data must use the `test_tenant` fixture to ensure tenant context is set and RLS is enforced.
- Use async test fixtures and sessions for all DB access in tests.
- See backend/README.md for test patterns and best practices.

## ➕ How to Extend (New Endpoints/Services)
- Add new endpoints by following the thin-endpoint, service-centric pattern: endpoints handle HTTP, services handle business logic.
- Always use async DB sessions and ensure tenant context is set via dependency/decorator.
- For new services, follow the OrderService pattern: all business logic, validation, and DB access in the service class.
- For new endpoints, see backend/app/api/v1/endpoints/orders.py as a reference.