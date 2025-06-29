# Module Dependencies

This document outlines the module dependency rules for the ConversationalCommerce platform.

## Module Boundaries

The codebase is organized into domain-specific modules with clear boundaries. Each module has specific responsibilities and allowed dependencies.

```
┌────────────┐
│            │
│    Core    │◄─────────────────┐
│            │                  │
└────────────┘                  │
      ▲                         │
      │                         │
┌─────┴──────┐                  │
│            │                  │
│   Tenant   │◄────────┐        │
│            │         │        │
└────────────┘         │        │
      ▲                │        │
      │                │        │
┌─────┴──────┐  ┌──────┴─────┐  │
│            │  │            │  │
│Conversation│  │  Product   │  │
│            │  │            │  │
└────────────┘  └────────────┘  │
                      ▲         │
                      │         │
               ┌──────┴─────┐   │
               │            │   │
               │   Order    │───┘
               │            │
               └────────────┘
                      ▲
                      │
               ┌──────┴─────┐
               │            │
               │ Storefront │
               │            │
               └────────────┘
```

## Module Dependency Rules

| Module           | Can Import From                       |
|------------------|--------------------------------------|
| **Core**         | _None (base module)_                  |
| **Tenant**       | Core                                 |
| **Conversation** | Core, Tenant                         |
| **Product**      | Core, Tenant                         |
| **Order**        | Core, Tenant, Product                |
| **Storefront**   | Core, Tenant, Product, Order         |
| **Theme**        | Core, Tenant                         |
| **Monitoring**   | Core                                 |
| **Payment**      | Core, Tenant, Order                  |
| **Security**     | Core                                 |

## Import Guidelines

### ✅ DO: Use direct module imports

```typescript
// For type-only imports
import type { UUID, Entity } from '@/modules/core/models/base';

// For value imports (enums, constants, functions)
import { Status } from '@/modules/core/models/base';
```

### ❌ DON'T: Use bridge files or centralized type repositories

```typescript
// BAD: Importing from bridge files
import { UUID, Entity, Status } from '@/types/base';
```

## Enforcement

Module boundaries are enforced through:

1. **ESLint Rules**: Custom ESLint rules prevent forbidden imports
2. **CI Checks**: Automated checks in the CI pipeline
3. **Code Review**: Manual verification during code review
4. **Barrel Files**: Explicit public API exports from modules

## Backend Module Structure

Backend modules follow similar boundaries:

```python
from app.core.config import get_settings  # Importing from core module
from app.models.user import User  # Importing DB models
from app.schemas.order import OrderCreate  # Importing schemas
```

## Module Responsibilities

### Core Module

- Base types and interfaces
- Utility functions
- Cross-cutting concerns
- Configuration

### Tenant Module

- Merchant management
- Multi-tenancy
- Tenant configuration
- Team management

### Product Module

- Product catalog
- Inventory management
- Product variations
- Categories and tags

### Order Module  

- Order processing
- Cart management
- Checkout flows
- Order history

### Conversation Module

- Chat management
- NLP processing
- Message templates
- Conversation state

### Storefront Module

- Storefront configuration
- Page builders
- Layout management
- Themes and styling

### Payment Module

- Payment processing
- Payment methods
- Transaction history
- Refunds and disputes

### Security Module

- Authentication
- Authorization
- Role management
- Access control
