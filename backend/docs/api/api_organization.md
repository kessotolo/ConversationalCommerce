# API Organization & Architecture

## Overview

The ConversationalCommerce backend follows a **modular API organization pattern** that separates routing concerns from business logic, ensuring clean boundaries, testability, and compliance with our coding rules.

## Directory Structure

```
/backend/app/api/
├── routers/              # API structure and grouping
│   ├── orders.py         # Order-related route definitions
│   ├── products.py       # Product-related route definitions
│   └── auth.py           # Authentication route definitions
├── v1/
│   └── endpoints/        # API v1 business logic
│       ├── orders.py     # Order endpoint implementations
│       ├── products.py   # Product endpoint implementations
│       └── auth.py       # Auth endpoint implementations
└── v2/
    └── endpoints/        # API v2 business logic (future)
        ├── orders.py
        └── products.py
```

## Separation of Concerns

### Routers (`/api/routers/`)
**Purpose**: Define API structure, grouping, and routing configuration
- **Route Registration**: Define URL patterns and HTTP methods
- **Dependency Injection**: Set up shared dependencies (auth, validation)
- **Version Management**: Handle API versioning and backward compatibility
- **Documentation**: OpenAPI tags and descriptions

### Endpoints (`/api/v1/endpoints/`)
**Purpose**: Implement business logic and handle HTTP requests
- **Request Processing**: Parse and validate incoming requests
- **Business Logic**: Delegate to service layer for core operations
- **Response Formatting**: Serialize responses and handle errors
- **Event Emission**: Trigger domain events for side effects

## Coding Rules Compliance

This organization pattern directly supports your coding rules:

### ✅ **Modular, Domain-Driven**
- Each domain (orders, products, auth) has its own router and endpoints
- Clear boundaries prevent cross-domain coupling
- Easy to extract microservices if needed

### ✅ **No Bridge/Barrel Files**
- Direct imports from module public APIs
- No centralized type repositories
- Each module exports its own interfaces

### ✅ **Explicit, Precise Types**
- Small, focused files make type safety easier to enforce
- Clear separation reduces complexity
- Easier to maintain strict TypeScript/Python typing

### ✅ **Testability**
- Endpoint logic can be tested independently from routing
- Service layer can be unit tested without HTTP concerns
- Clear separation enables focused test strategies

### ✅ **Documentation**
- Each module can have its own README
- Clear boundaries make documentation easier to maintain
- Architecture decisions are well-documented

## Implementation Guidelines

### Router Pattern
```python
# /api/routers/orders.py
from fastapi import APIRouter, Depends
from app.api.v1.endpoints import orders as order_endpoints

router = APIRouter(prefix="/orders", tags=["orders"])

# Route definitions - thin delegation to endpoints
router.add_api_route(
    "/",
    order_endpoints.create_order,
    methods=["POST"],
    dependencies=[Depends(get_current_user)]
)

router.add_api_route(
    "/{order_id}",
    order_endpoints.get_order,
    methods=["GET"],
    dependencies=[Depends(get_current_user)]
)
```

### Endpoint Pattern
```python
# /api/v1/endpoints/orders.py
from fastapi import HTTPException, Depends
from app.services.order_service import OrderService
from app.schemas.order import OrderCreate, OrderResponse

async def create_order(
    order_data: OrderCreate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OrderResponse:
    """Create a new order - thin endpoint delegating to service"""
    order_service = OrderService(db)

    try:
        order = await order_service.create_order(order_data, current_user)
        return OrderResponse.from_orm(order)
    except OrderServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

## Benefits of This Pattern

### 1. **Scalability**
- Easy to add new API versions without touching existing code
- Clear separation makes it easier to extract microservices
- Domain boundaries prevent coupling

### 2. **Maintainability**
- Small, focused files (under 500 lines as per coding rules)
- Clear separation of concerns
- Easy to locate and modify specific functionality

### 3. **Testability**
- Endpoint logic can be unit tested without HTTP overhead
- Service layer can be tested independently
- Clear boundaries enable focused test strategies

### 4. **Developer Experience**
- Clear file organization makes code easier to navigate
- Consistent patterns across all API modules
- Reduced cognitive load when working on specific domains

## Migration from Legacy Structure

If you have legacy code that doesn't follow this pattern:

1. **Extract Routers**: Move route definitions to `/api/routers/`
2. **Extract Endpoints**: Move business logic to `/api/v1/endpoints/`
3. **Update Imports**: Ensure all imports follow the new structure
4. **Add Documentation**: Document the new organization pattern

## Best Practices

1. **Keep Routers Thin**: Routers should only handle routing concerns
2. **Keep Endpoints Thin**: Endpoints should delegate to service layer
3. **Use Service Layer**: All business logic goes in service classes
4. **Follow Domain Boundaries**: Don't mix concerns between domains
5. **Document Changes**: Update documentation when adding new endpoints

## Compliance with Coding Rules

This organization pattern ensures compliance with all your coding rules:

- ✅ **Maximum 500 lines per file**: Small, focused files
- ✅ **Modular structure**: Clear domain boundaries
- ✅ **No bridge files**: Direct imports only
- ✅ **Type safety**: Easier to enforce in smaller files
- ✅ **Testability**: Clear separation enables focused testing
- ✅ **Documentation**: Each module can be documented independently

For more details on specific API patterns, see the individual endpoint documentation in `/backend/docs/api/`.