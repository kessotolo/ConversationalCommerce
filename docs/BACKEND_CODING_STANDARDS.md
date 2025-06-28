# Backend Coding Standards

## 🚀 Core Development Principles

This document outlines the coding standards for the ConversationalCommerce backend, with specific focus on preventing recurring issues identified during our refactoring work. These standards supplement the guidelines in AI_AGENT_CONFIG.md with specific backend coding rules.

## 📐 Python & FastAPI Standards

### Async/Await and SQLAlchemy

1. **AsyncSession Only:** Always use `AsyncSession` for database access. Never mix sync and async SQLAlchemy patterns.
   ```python
   # ✅ CORRECT: AsyncSession with proper async/await
   async def get_user(db: AsyncSession, user_id: UUID) -> User:
       result = await db.execute(select(User).where(User.id == user_id))
       return result.scalars().first()
   
   # ❌ INCORRECT: Using sync Session or query pattern
   def get_user(db: Session, user_id: UUID) -> User:
       return db.query(User).filter(User.id == user_id).first()
   ```

2. **Consistent Query Pattern:** Always use `await db.execute(select(...))` pattern with proper SQL expressions.
   ```python
   # ✅ CORRECT: Modern SQLAlchemy 2.x pattern
   result = await db.execute(select(User).where(User.id == user_id))
   user = result.scalars().first()
   
   # ❌ INCORRECT: Legacy query pattern
   user = db.query(User).filter(User.id == user_id).first()
   ```

3. **Proper Transaction Handling:** Always use `await` with transaction operations.
   ```python
   # ✅ CORRECT: Async commit and refresh
   db.add(user)
   await db.commit()
   await db.refresh(user)
   
   # ❌ INCORRECT: Missing await
   db.add(user)
   db.commit()
   db.refresh(user)
   ```

4. **Test Fixture Compatibility:** Ensure all services support AsyncSession for testing compatibility.
   ```python
   # ✅ CORRECT: AsyncSession in function signature
   async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
       # implementation
   
   # ❌ INCORRECT: Using Session type
   async def create_user(db: Session, user_data: UserCreate) -> User:
       # implementation
   ```

### Service Organization

1. **Single Responsibility Services:** Keep services focused on a single domain concern.
   - **Maximum Service Size:** Services should not exceed 500 lines of code
   - **Maximum Function Size:** Functions should not exceed 50 lines of code

2. **Orchestrator Pattern:** Large service files must be split using the orchestrator pattern:
   ```
   services/
   ├── domain/
   │   ├── domain_service.py (orchestrator)
   │   ├── domain_crud.py
   │   ├── domain_validator.py
   │   ├── domain_publisher.py
   │   └── domain_utils.py
   ```

3. **Service Method Signatures:** Standardize method signatures:
   ```python
   # ✅ CORRECT: Explicit types, AsyncSession first parameter
   async def create_entity(
       self,
       db: AsyncSession,
       tenant_id: UUID,
       entity_data: EntityCreate
   ) -> Entity:
       # implementation
   ```

### Error Handling

1. **Custom Exception Hierarchy:** Use custom exceptions with meaningful names.
   ```python
   # ✅ CORRECT: Custom exceptions
   class EntityNotFoundError(AppException):
       """Raised when an entity cannot be found."""
       def __init__(self, entity_type: str, entity_id: Any):
           super().__init__(f"{entity_type} with ID {entity_id} not found")
   
   # ❌ INCORRECT: Generic exceptions
   raise Exception("User not found")
   ```

2. **Try-Except Blocks:** Always catch specific exceptions.
   ```python
   # ✅ CORRECT: Catch specific exceptions
   try:
       result = await db.execute(select(User).where(User.id == user_id))
       user = result.scalars().first()
       if not user:
           raise EntityNotFoundError("User", user_id)
       return user
   except SQLAlchemyError as e:
       raise DatabaseError(str(e)) from e
   
   # ❌ INCORRECT: Bare except
   try:
       # implementation
   except:
       # handle error
   ```

### Imports and Module Organization

1. **Import Organization:** Group imports by standard library, third-party, and local.
   ```python
   # Standard library imports
   import uuid
   from typing import List, Optional
   
   # Third-party imports
   from fastapi import HTTPException, Depends
   from pydantic import BaseModel
   from sqlalchemy.ext.asyncio import AsyncSession
   from sqlalchemy.future import select
   
   # Local imports
   from app.core.config import settings
   from app.models.user import User
   from app.schemas.user import UserCreate, UserUpdate
   ```

2. **Absolute Imports:** Always use absolute imports from app root.
   ```python
   # ✅ CORRECT: Absolute imports
   from app.models.user import User
   
   # ❌ INCORRECT: Relative imports
   from ...models.user import User
   ```

### Type Annotations

1. **Explicit Return Types:** Always include return type annotations.
   ```python
   # ✅ CORRECT: Return type annotation
   async def get_user(db: AsyncSession, user_id: UUID) -> Optional[User]:
       # implementation
   
   # ❌ INCORRECT: Missing return type
   async def get_user(db: AsyncSession, user_id: UUID):
       # implementation
   ```

2. **Pydantic Models:** Use Pydantic for data validation and serialization.
   ```python
   # ✅ CORRECT: Pydantic model
   class UserCreate(BaseModel):
       email: str
       full_name: str
       password: str
   ```

### Testing

1. **Test Isolation:** Each test should run in isolation with proper setup/teardown.

2. **Async Test Fixtures:** Use pytest-asyncio fixtures for async operations.
   ```python
   # ✅ CORRECT: Async fixture usage
   @pytest.mark.asyncio
   async def test_create_user(async_db_session: AsyncSession):
       # test implementation
   ```

3. **No Mocks for Core Logic:** Test core business logic against real database fixtures.

## 🔍 Standards Enforcement

### Code Review Checklist

- [ ] All database operations use AsyncSession with proper async/await
- [ ] No sync Session or .query() usage
- [ ] Service files are under 500 lines
- [ ] Functions are under 50 lines
- [ ] Proper error handling with specific exceptions
- [ ] All methods have explicit return type annotations
- [ ] Proper database transaction handling
- [ ] Tests use async_db_session fixture when working with database

### Linting and Static Analysis

Configure flake8, mypy, and black with the following settings:

```ini
# .flake8
[flake8]
max-line-length = 88
extend-ignore = E203
exclude = .git,__pycache__,docs/source/conf.py,old,build,dist
per-file-ignores =
    __init__.py:F401,F403
    tests/*:F401,F403

# mypy.ini
[mypy]
python_version = 3.12
warn_return_any = True
warn_unused_configs = True
disallow_untyped_defs = True
disallow_incomplete_defs = True
check_untyped_defs = True
disallow_untyped_decorators = True
no_implicit_optional = True
strict_optional = True

[mypy.plugins.sqlalchemy.ext.mypy_plugin]
follow_imports = skip

# pyproject.toml (black)
[tool.black]
line-length = 88
target-version = ['py312']
```

## 🧰 Anti-Patterns to Avoid

1. **Large Monolithic Services:** Split services exceeding 500 lines
2. **Mixed Sync/Async DB Operations:** Standardize on AsyncSession everywhere
3. **Direct DB Access in API Endpoints:** Always use service layer
4. **Insufficient Error Handling:** Use custom exception hierarchy
5. **Query String Concatenation:** Use SQLAlchemy expressions only
6. **Untyped Functions:** Add type annotations for all parameters and returns
7. **Missing Docstrings:** Document all public functions and classes
8. **Test Fixture Misuse:** Ensure tests use async_db_session for database operations
9. **Inconsistent Validation:** Use Pydantic models consistently
10. **Non-Isolated Tests:** Each test should run independently

## 📚 Example: Refactored Service Structure

```
services/
├── storefront/
│   ├── permissions/
│   │   ├── __init__.py
│   │   ├── storefront_permissions_service.py (orchestrator)
│   │   ├── storefront_role_service.py
│   │   ├── storefront_section_permissions_service.py
│   │   ├── storefront_component_permissions_service.py
│   │   ├── storefront_permissions_utils.py
│   │   ├── storefront_permissions_validator.py
│   │   └── storefront_html_sanitizer.py
```

By following these standards, we will prevent recurring issues and maintain a clean, maintainable codebase.
