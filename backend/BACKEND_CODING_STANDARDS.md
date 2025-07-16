## Orchestration & Modularization
- Never concentrate business logic in large, monolithic files or "god objects."
- Use orchestration patterns: break down complex workflows into small, focused services, handlers, or orchestrators.
- Service files: Max 500 lines. Functions/methods: Max 50 lines. If exceeded, split into orchestrator + sub-services/handlers.
- Orchestrators coordinate; sub-services/handlers have single responsibility.
- Document orchestrator workflows with diagrams or step lists.
- All business logic in service classes/functions, not endpoints/controllers.
- Endpoints/controllers must be thin, delegating orchestration to services.
- For multi-step processes, use a dedicated orchestrator or handler that calls smaller, single-purpose services.
- Use events and handlers for decoupling (event-driven patterns).
- If a file grows beyond ~200 lines or covers more than one responsibility, split it.
- Never allow a file to become a "god file."

## Database & Model Standards
- **UUID-only IDs:** ALL database models MUST use UUID primary keys and foreign keys:
  ```python
  import uuid
  from sqlalchemy.dialects.postgresql import UUID

  id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
  tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
  ```
- **Multi-tenant by default:** Every tenant-scoped model MUST include `tenant_id` UUID foreign key.
- **No Integer or String IDs** for entities - UUIDs provide better security, scalability, and collision resistance.
- **Consistent model patterns:** Use `created_at`, `updated_at` with timezone-aware DateTime columns.
- **Row Level Security (RLS):** All tenant-scoped tables must have RLS policies enforcing tenant isolation.
- **Migration discipline:** All schema changes via Alembic migrations, never manual SQL.
- **Foreign key constraints:** Always define proper foreign key relationships for data integrity.

## Async/Await and SQLAlchemy Standards
- Always use context managers (`async with AsyncSession() as session:`) to ensure sessions are closed, even on error.
- Absolutely prohibit mixing sync and async SQLAlchemy sessions in the same service or test.
- Prefer SQLAlchemy 2.0 style queries (`select()`, `update()`, `delete()`) and avoid legacy ORM patterns.
- Document where transactions start/end. Use `async with session.begin():` for atomic operations.
- All test fixtures must use async sessions and be compatible with pytest-asyncio.

## Error Handling
- All exceptions must inherit from a project base exception (e.g., `AppError`).
- Use specific exceptions for known error cases (e.g., `PermissionDenied`, `NotFound`).
- Use decorators or middleware to map exceptions to HTTP responses.
- Always catch specific exceptions; never use `except:` without a type.

## Testing & Fixtures
- All test fixtures must be async and use the same session pattern as production code.
- Use database rollbacks or truncation between tests to ensure isolation.
- Always test with multiple tenants and verify RLS is enforced.

## Code Review Checklist
- [ ] No mixed sync/async code
- [ ] All services and handlers are under size limits
- [ ] Orchestrator pattern used for complex workflows
- [ ] All exceptions are custom and mapped to HTTP responses
- [ ] All code is type-annotated and passes lint/type-check
- [ ] All tests use async fixtures and verify tenant isolation
- [ ] **All models use UUID primary/foreign keys**
- [ ] **Multi-tenant models include tenant_id**
- [ ] No anti-patterns (see below)

## Anti-Patterns to Avoid
- Large, monolithic service files ("god objects")
- Business logic in endpoints/controllers
- Sync DB calls in async code
- Bare `except:` blocks
- Unhandled async errors
- Test fixtures that leak data or use sync sessions
- Bridge files or centralized type directories
- **Integer or String primary keys for entities**
- **Models without tenant_id for tenant-scoped data**

## Tooling & Automation
- Pre-commit: Run `black`, `isort`, `flake8`, and `mypy` before every commit.
- CI: All PRs must pass lint, type-check, and test suites.
- **UUID Compliance:** Run `python backend/scripts/check_uuid_compliance.py` to verify all models follow UUID standards.
- Optionally, add a script to warn on large files/functions.

## Sample Orchestrator Pattern (Python)
```python
class OrderOrchestrator:
    async def process_order(self, order_data: OrderData) -> Result[Order, AppError]:
        try:
            order = await self.order_service.create_order(order_data)
            await self.payment_service.charge(order)
            await self.notification_service.send_confirmation(order)
            return Result.success(order)
        except AppError as e:
            logger.error(f"Order processing failed: {e}")
            raise
```