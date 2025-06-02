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

We have successfully completed our systematic refactoring of the codebase to eliminate technical debt related to imports. All phases of this initiative are now complete:

1. **Phase 1 ✅ Complete**: All StorefrontEditor components now use absolute imports with the `@` alias pattern
2. **Phase 2 ✅ Complete**: Fixed cross-module imports in library files (`/lib/cart.ts`, `/lib/api/storefrontEditor.ts`, `/lib/api.ts`)
3. **Phase 3 ✅ Complete**: Verified component and hook imports across dashboard and monitoring components
4. **Phase 4 ✅ Complete**: Fixed context-related imports in provider components and inter-context dependencies
5. **Phase 5 ✅ Complete**: Addressed storefront component imports, ensuring consistent path resolution

The codebase now fully adheres to our modular monolith architecture principles with respect to import patterns. All modules use absolute imports with the `@/` alias, making dependencies explicit and improving maintainability.

### Best Practices for Avoiding Import-Related Technical Debt

1. **Use Absolute Imports**: Always use the `@` alias to create clear, consistent import paths
2. **No Bridge Files**: Import directly from source modules rather than through bridge files
3. **Respect Module Boundaries**: Follow the defined module dependency hierarchy
4. **Group Imports Logically**: Organize imports by source (React/Next.js, third-party, internal modules)
5. **Import Types Explicitly**: Use `import type` syntax for type-only imports
6. **Complete Refactorings Fully**: When moving code, update all import references throughout the codebase
7. **Use Linting Rules**: Configure ESLint to enforce proper import patterns

### Team Knowledge Sharing & Onboarding

#### Import Standards for All Team Members

As our codebase now fully adheres to absolute import patterns with the `@/` alias, all team members should follow these guidelines:

- **Never use relative imports** (`../` or `./`) for cross-module references
- Use ESLint's import rules to automatically check for import correctness
- New modules should be organized to fit within the existing module boundaries
- Import from the most specific module possible (don't bypass module boundaries)
- When onboarding new developers, emphasize our import standards as a key architectural principle

These consistent practices ensure our modular monolith architecture remains maintainable and scalable as the team and codebase grow.

### TypeScript Type Safety Standards

#### Type Safety Improvement Plan

We are systematically eliminating all `any` types from the codebase through a phased approach:

##### Phase 1: Core Models & Type Foundations ✅ COMPLETE (June 2025)

**Goal:** Eliminate `any` from foundational models to prevent type leaks and improve downstream type safety.

**Completed Actions:**

- Replaced all `any` and `Record<string, any>` in core models with explicit interfaces, generics, and discriminated unions
- Implemented `FilterOption<T>` and `FilterGroup<T>` using generics instead of `any`
- Replaced dynamic objects with `Record<string, unknown>` for improved type safety
- Added proper documentation for complex type decisions
- Created specific interfaces like `BaseDetails` for previously untyped objects

##### Phase 2: API Layer – DTOs, Consistency, and Service Integration ✅ COMPLETE (June 2025)

**Goal:** Achieve type-safe, predictable API consumption and error handling across the app.

**Completed Actions:**

- Defined TypeScript interfaces for all API requests and responses (DTOs) in `/lib/api/types.ts` and `/lib/api/storefrontEditor.types.ts`
- Used generics for API response wrappers (`ApiResponse<T>`) with `unknown` instead of `any`
- Eliminated bridge files by using direct imports from DTO files
- Refactored API method parameters to use specific interfaces instead of `any`
- Implemented type-safe error handling with `unknown` and type guards
- Updated all UI components to consume the type-safe API layer
- Replaced error handlers with proper type narrowing
- Migrated all Banner/Logo management components to use the new DTOs

##### Phase 3: Component Props, Hooks, and Contexts ✅ COMPLETE (June 2025)

**Goal:** Eliminate all `any` types in component props, hooks, and contexts to enforce strict typing.

**Completed Actions:**

- Created comprehensive event type definitions in `src/types/events.ts` for all React event handlers
- Enhanced WebSocket message types with discriminated unions for domain-specific payloads
- Added type guards for safe runtime discrimination of WebSocket message types
- Added explicit generic type parameters to React hooks (useState, useRef, etc.)
- Used domain types instead of primitives for state variables (e.g., `Banner['status']` vs string)
- Improved typing for callback props and event handlers across components
- Updated context providers with explicit typing for consumers
- Implemented proper return types for custom hooks like `useThemeStyles`
- Strengthened form submission handlers with correct event types
- Enhanced monitoring components to use type-safe WebSocket message handling

**Next Phases:**

1. **Phase 4:** Error Handling and Dynamic Index Signatures
2. **Phase 5:** Type Declarations and Legacy/3rd-Party Integration

#### Type Safety Best Practices for All Developers and AI Assistants

The following type safety standards must be followed by all team members and AI assistants when contributing to this codebase:

1. **Strict Type Boundaries**:

   - Every module boundary must use explicit types, never `any`
   - Use interfaces for public APIs between modules
   - Domain models must have complete type definitions

2. **Avoid `any` Type**:

   - Never introduce new usages of the `any` type
   - Use `unknown` with type guards for truly dynamic data
   - Use generics with constraints instead of `any` for flexible APIs
   - For record types, use `Record<string, unknown>` instead of `{[key: string]: any}`

3. **Type-Safe Patterns**:

   - Use tagged unions (discriminated unions) for state modeling
   - Implement branded types for IDs and special string types
   - Leverage TypeScript's utility types (`Partial<T>`, `Pick<T>`, etc.)
   - Use template literal types for string patterns

4. **Domain-Driven Types**:

   - Types should reflect domain models defined in architecture
   - DTOs should closely match API contracts
   - Follow the single source of truth principle for type definitions

5. **Progressive Type Strengthening**:
   - Start with broad types when necessary, then refine
   - Add JSDoc comments to explain complex type decisions
   - Document temporary type compromises with clear TODO comments

#### Instructions for AI Assistants

When working with this codebase, AI assistants MUST:

- **Never suggest code that introduces `any` types**
- Analyze existing types before proposing changes
- Respect module boundaries in type definitions
- Suggest proper type definitions for any untyped or loosely typed code
- Explain type design decisions in comments
- Recommend type improvements when encountering `any` types
- Validate that generated code passes TypeScript's strict type checking

These standards ensure consistent type safety across our modular monolith architecture, reducing runtime errors and improving maintainability as the codebase evolves.

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
