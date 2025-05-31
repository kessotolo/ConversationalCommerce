# Developer Onboarding Guide: ConversationalCommerce Frontend

Welcome to the ConversationalCommerce platform! This guide will help you understand our architecture, development practices, and codebase organization so you can quickly become productive.

## Architecture Overview

The ConversationalCommerce frontend follows a **modular monolith architecture**. This means:

- All code is deployed as a single application
- The codebase is divided into distinct modules with clear boundaries
- Each module has its own domain responsibility
- Modules communicate through well-defined interfaces
- Direct module imports are used instead of centralized type repositories

## Module Structure

Our codebase is organized into these modules:

| Module | Responsibility | Can Import From |
|--------|----------------|----------------|
| **Core** | Base types, utilities, cross-cutting concerns | *None (base module)* |
| **Tenant** | Merchant configuration and management | Core |
| **Conversation** | Messaging system | Core, Tenant |
| **Product** | Product catalog management | Core, Tenant |
| **Order** | Order processing and transactions | Core, Tenant, Product |
| **Storefront** | Storefront configuration | Core, Tenant, Product, Order |
| **Theme** | Theming engine and configuration | Core, Tenant |
| **Monitoring** | System monitoring and alerts | Core |

## Import Guidelines

### ✅ DO: Use direct module imports

```typescript
// For type-only imports
import type { UUID, Entity } from '@/modules/core/models/base';

// For value imports (enums, constants, functions)
import { Status } from '@/modules/core/models/base';
```

### ❌ DON'T: Create bridge files or import across module boundaries incorrectly

```typescript
// DON'T: Create centralized type files
// src/types/myTypes.ts - This pattern is not allowed

// DON'T: Import across unauthorized module boundaries
// Core module importing from Tenant module - This would violate module boundaries
```

## Type System

We've standardized on these key types:

- **UUID**: `type UUID = string` - All IDs use this type
- **Entity**: Base interface with `id`, `created_at`, `updated_at` properties
- **TenantScoped**: For multi-tenant data with `tenant_id`

Example:
```typescript
import type { Entity } from '@/modules/core/models/base';

// Extend the base types for domain models
export interface Product extends Entity {
  name: string;
  description: string;
  // id and created_at are already included from Entity
}
```

## Code Quality Tools

We enforce our architecture through:

1. **ESLint Rules**: Prevents unauthorized imports and enforces patterns
2. **TypeScript Strict Mode**: Ensures type safety
3. **Architecture Verification**: Run with `npm run verify:architecture`
4. **Pre-commit Hooks**: Verify code before commits

## Getting Started

1. Review the [Architecture Documentation](ARCHITECTURE.md) for detailed patterns
2. Read the [Architecture Decision Records](../docs/architecture/decisions/) for context
3. Study the [Technical Guide](TECHNICAL_GUIDE.md) for implementation details
4. Run `npm run verify:architecture` to ensure your changes maintain architectural integrity

## Best Practices

1. **Module Placement**: Always place new code in the appropriate module
2. **Type Imports**: Use `import type` for interfaces and types
3. **Module Boundaries**: Respect the defined module dependencies
4. **Component Organization**: Keep related components together in their module
5. **Documentation**: Update docs when making architectural changes

## Need Help?

- Check our [Architecture Decision Records](../docs/architecture/decisions/)
- Review the ESLint errors carefully - they often point to architectural issues
- Ask questions in our #architecture Slack channel

Welcome aboard! We're excited to have you contribute to ConversationalCommerce.
