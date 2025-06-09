## 🛠️ Order API & Service Refactor (2024-06)

- All business logic and validation for order operations is now centralized in the service layer (`order_service.py`).
- API endpoints are thin and focused on HTTP concerns, delegating all business logic to the service.
- A DRY error handler decorator is used on all order endpoints to map custom service exceptions to standardized HTTP responses.
- Transaction boundaries are managed by a `@transactional` decorator in the service layer, ensuring atomicity and rollback on error.
- A custom exception hierarchy (`OrderError`, `OrderNotFoundError`, `OrderValidationError`) is used for robust, expressive error handling in the service layer.
- Error-to-HTTP mapping is now centralized and consistent, improving maintainability and client experience.
- All tests and documentation have been updated to reflect these changes, and the codebase is now easier to extend and maintain for future contributors.
- All database migrations are managed using Alembic in the backend directory. See `backend/README.md` for workflow, troubleshooting, and best practices.