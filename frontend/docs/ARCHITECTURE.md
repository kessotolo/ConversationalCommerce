# ConversationalCommerce Architecture Guidelines

## Modular Monolith Architecture

The ConversationalCommerce platform follows a modular monolith architecture, which divides the codebase into distinct modules with clear boundaries while maintaining the deployment simplicity of a monolith.

### Core Principles

1. **Clear Module Boundaries**: Each domain has its own module with well-defined interfaces.
2. **Direct Module Imports**: Always import directly from module source files.
3. **Type Safety**: Use TypeScript types consistently across module boundaries.
4. **Service Layer**: Business logic is encapsulated in services that follow the dependency inversion principle.
5. **No Bridge Files**: All types are imported directly from their module source files.

## Module Structure

Our application is organized into these primary modules:

- **Core**: Base types, services, and cross-cutting concerns (`@/modules/core/models/base`, etc.)
- **Tenant**: Merchant management and configuration (`@/modules/tenant/models`, etc.)
- **Conversation**: Messaging and chat functionality (`@/modules/conversation/models`, etc.)
- **Product**: Product catalog and categories (`@/modules/product/models`, etc.)
- **Order**: Order processing and transactions (`@/modules/order/models`, etc.)
- **Storefront**: Storefront configuration and customization (`@/modules/storefront/models`, etc.)
- **Theme**: Theming and styling configuration (`@/modules/theme/models`, etc.)
- **Monitoring**: System monitoring and alerts (`@/modules/monitoring/models`, etc.)

## Module Boundaries

The following defines which modules can import from which others:

- **Core**: Cannot import from other modules (base module)
- **Tenant**: Can import from Core
- **Conversation**: Can import from Core, Tenant
- **Product**: Can import from Core, Tenant
- **Order**: Can import from Core, Tenant, Product
- **Storefront**: Can import from Core, Tenant, Product, Order
- **Theme**: Can import from Core, Tenant
- **Monitoring**: Can import from Core

## Import Guidelines

### Preferred Import Patterns

```typescript
// ✅ DO: Use direct module imports with type imports where appropriate
import type { UUID, Entity } from '@/modules/core/models/base';
import { Status } from '@/modules/core/models/base';
import type { Banner } from '@/modules/storefront/models/banner';

// ✅ DO: Use absolute imports for internal API services
import { getDrafts, publishDraft } from '@/lib/api/storefrontEditor';

// ✅ DO: Use absolute imports for UI components
import { Button } from '@/components/ui/Button';
import { Dialog } from '@headlessui/react';

// ❌ DON'T: Use relative imports crossing module boundaries
// import { UUID } from '../../modules/core/models/base';

// ❌ DON'T: Use bridge pattern files that only re-export from proper modules
// import { Banner } from '../../../types/storefrontEditor';
```

### Import Refactoring Initiative

We are systematically refactoring the codebase to eliminate technical debt related to imports. This work follows a phased approach:

1. **Phase 1 ✅ Complete**: All StorefrontEditor components now use absolute imports with the `@` alias pattern
2. **Phase 2 ✅ Complete**: Fixed cross-module imports in library files (`/lib/cart.ts`, `/lib/api/storefrontEditor.ts`, `/lib/api.ts`)
3. **Phase 3 ✅ Complete**: Verified component and hook imports across dashboard and monitoring components
4. **Phase 4 🔄 In Progress**: Fixing context-related imports
5. **Phase 5**: Addressing storefront component imports

### Best Practices for Avoiding Import-Related Technical Debt

1. **Use Absolute Imports**: Always use the `@` alias to create clear, consistent import paths
2. **No Bridge Files**: Import directly from source modules rather than through bridge files
3. **Respect Module Boundaries**: Follow the defined module dependency hierarchy
4. **Group Imports Logically**: Organize imports by source (React/Next.js, third-party, internal modules)
5. **Import Types Explicitly**: Use `import type` syntax for type-only imports
6. **Complete Refactorings Fully**: When moving code, update all import references throughout the codebase
7. **Use Linting Rules**: Configure ESLint to enforce proper import patterns

### Prohibited Import Patterns

```typescript
// DON'T: Bridge files no longer exist in the codebase
import { UUID, Status as DraftStatus } from '../types/storefrontEditor';

// DON'T: Avoid creating new type files outside of modules
// Instead create types in their proper module directories
```

## Type Import Guidelines

1. **Type-Only Imports**: Use `import type` for interfaces, types and other type-only constructs for better tree-shaking
2. **Value Imports**: Use regular imports for enums, constants, and other values
3. **No Type Aliases**: Avoid creating aliases for types from other modules (e.g., use `Status` not `DraftStatus`)
4. **Consistent Casing**: Ensure file casing matches import statements to avoid cross-platform issues

## Import Organization

Imports should be organized in the following order:

1. Built-in Node modules
2. External packages
3. Internal modules, with Core modules first
4. Parent and sibling imports
5. Type imports

```typescript
// Built-in modules
import path from 'path';

// External packages
import { useState } from 'react';
import axios from 'axios';

// Internal modules (Core first)
import { ServiceRegistry } from '@/modules/core/services/ServiceRegistry';
import { ProductService } from '@/modules/product/services/ProductService';

// Parent/sibling imports
import { ProductCard } from '../components/ProductCard';

// Type imports
import type { Product } from '@/modules/product/models/product';
```

## Architectural Enforcement

The architecture is enforced through:

1. **ESLint Rules**: Prevents imports from non-existent bridge files and enforces import patterns
2. **TypeScript Strict Mode**: Ensures type safety across module boundaries
3. **Architecture Verification Script**: Run `npm run verify:architecture` to validate compliance
4. **Pre-build Checks**: Architecture verification runs automatically before builds

See the [Architecture Decision Record](../../docs/architecture/decisions/0001-direct-module-imports.md) for more details on the direct module imports decision.

All bridge files under `/src/types/` have been deprecated in favor of direct module imports:

- `storefrontEditor.ts` → Various modules under `@core/models/base` and `@storefront/models/*`
- `Theme.ts` → `@theme/models/theme`
- `Monitoring.ts` → `@monitoring/models/*`
- `Violation.ts` → `@violation/models/violation`

### Linting Rules

ESLint has been configured to prevent imports from bridge files.

## UUID Standards

The project standardizes on UUID types for database primary keys and foreign keys. All models use PostgreSQL UUID types consistently rather than String-based IDs.
