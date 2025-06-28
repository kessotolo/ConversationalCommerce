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
- [ ] No anti-patterns (see below)

## Anti-Patterns to Avoid
- Large, monolithic service files ("god objects")
- Business logic in endpoints/controllers
- Sync DB calls in async code
- Bare `except:` blocks
- Unhandled async errors
- Test fixtures that leak data or use sync sessions
- Bridge files or centralized type directories

## Tooling & Automation
- Pre-commit: Run `black`, `isort`, `flake8`, and `mypy` before every commit.
- CI: All PRs must pass lint, type-check, and test suites.
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