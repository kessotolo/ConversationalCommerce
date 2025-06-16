# Contributing to ConversationalCommerce Backend

Thank you for contributing! Please follow these guidelines to ensure code quality, maintainability, and alignment with our multi-tenant, async, and secure architecture.

## 🏗️ Architectural Principles
- **Multi-Tenancy:** All features must support strict tenant isolation. Use tenant context from middleware/dependencies, never set tenant context in services or endpoints.
- **PostgreSQL RLS:** All tenant data is protected by Row-Level Security. Never bypass RLS or access data across tenants.
- **Async First:** All database access and business logic must be async. Do not mix sync and async DB sessions.
- **Service-Centric:** Endpoints should be thin, delegating all business logic to service classes (see OrderService pattern).
- **Extensibility:** Write code that is easy to extend for new tenants, endpoints, or features.

## 🧪 Testing Best Practices
- Use async fixtures and sessions for all DB access in tests.
- Always use the `test_tenant` fixture for tests that touch tenant data.
- Ensure test isolation: no data leakage between tenants or test runs.
- Test RLS by verifying that data is only visible to the correct tenant.
- Standardize error response checks using the `{ "detail": ... }` format.

## 🛡️ Error Handling
- All API errors must use the standardized error response format:
  ```json
  { "detail": "Error message here" }
  ```
- See backend/docs/api/orders.md for examples.

## ➕ Adding New Features
- Use async DB sessions and ensure tenant context is set via dependency/middleware.
- Follow the thin-endpoint, service-centric pattern.
- Reference backend/README.md and docs/architecture.md for patterns and best practices.
- **For onboarding flows:**
  - Use the onboarding endpoints in `api/v1/endpoints/onboarding.py` and the `SellerOnboardingService` in `services/seller_onboarding_service.py` as your pattern.
  - All onboarding steps must log analytics/events using the ConversationEvent pattern (see backend/README.md for details).

## 🔄 API Versioning Guidelines
- **When to version:** Create a new version when making breaking changes to existing endpoints.
- **How to version:** Place new API endpoints in the `/api/v2/` directory structure.
- **Backward compatibility:** Never modify existing v1 endpoints in ways that break compatibility.
- **Documentation:** Update documentation for both v1 and v2 versions when adding new functionality.
- **Reference:** Follow the detailed guidelines in [backend/docs/api/api_versioning.md](backend/docs/api/api_versioning.md).
- **Testing:** Write tests for both v1 and v2 endpoints to ensure proper functionality.

## 📚 References
- [backend/README.md](backend/README.md)
- [docs/architecture.md](docs/architecture.md)
- [backend/docs/api/orders.md](backend/docs/api/orders.md)