# Architecture Overview

## 🚀 Our Core: Commerce in Conversation

The architecture of ConversationalCommerce is centered on enabling commerce in conversation as the default. All modules, APIs, and flows are designed to work seamlessly in chat (WhatsApp, IG, TikTok, etc.) as well as on the web. The webapp is a complement, but the heart of the platform is enabling every commerce action—discovery, cart, upsell, checkout, payment—through natural conversation, just as Africans do commerce every day.

## WhatsApp NLP Integration (ADR-0005) ✅ VERIFIED

Our multi-tenant WhatsApp NLP cart management system has been successfully implemented and verified against requirements:

- **Seller-Specific WhatsApp Numbers**: Confirmed each seller uses their own WhatsApp number ✅
- **No Web Chat Interface Requirement**: Implementation uses direct WhatsApp integration without requiring web chat ✅
- **NLP Intent Processing**: Successfully handles cart management commands through natural language ✅
- **Multi-Tenant Message Routing**: Correctly routes messages to the appropriate seller based on the receiving number ✅
- **Seamless Integration with Existing NLP Pipeline**: Leverages the same backend NLP intent classification system ✅

The architecture uses a webhook-based approach that integrates with our existing NLP pipeline, maintaining clear module boundaries while enabling commerce in conversation through WhatsApp.

## Direct Module Imports (ADR-0001)

- All types and models must be imported directly from their module source (e.g., @/modules/core/models/base).
- Bridge files (e.g., src/types/storefrontEditor.ts) are not allowed and will be flagged by lint/CI.
- ESLint rules strictly enforce this pattern (see .eslintrc.js).
- See [ADR-0001: Direct Module Imports vs Bridge Files](./architecture/decisions/0001-direct-module-imports.md) for rationale and migration details.

**Benefits:**

- Cleaner and more maintainable codebase
- Clear module boundaries and dependencies
- Improved type safety and consistency
- Better IDE support and tree-shaking
- Easier onboarding for new developers

---

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
  - **WhatsApp**: WhatsApp Business API integration and NLP cart management
  - **NLP**: Natural language processing for cart intents and product extraction
- **Product**: Product catalog and categories (`@/modules/product/models`, etc.)
- **Order**: Order processing and transactions (`@/modules/order/models`, etc.)
- **Storefront**: Storefront configuration and customization (`@/modules/storefront/models`, etc.)
- **Theme**: Theming and styling configuration (`@/modules/theme/models`, etc.)
- **Monitoring**: System monitoring and alerts (`@/modules/monitoring/models`, etc.)

### Next.js App Router: 'use client' Directive

- Any file in `src/app/` that uses React hooks (e.g., `useState`, `useEffect`, `useParams`) **must** start with `'use client';` as the very first line.
- This marks the file as a Client Component, allowing use of browser APIs and hooks.
- Omitting this will cause build failures in CI and on Vercel ("hooks only work in client components").
- **Best Practice:** Always add `'use client';` to the top of any App Router page/component using hooks or browser APIs.
- Applies to both `.tsx` and `.jsx` files.
- See: [Next.js docs](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#client-components)

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

### Module Public APIs

Each module exposes its types and functionality through a public API (index.ts file). Other modules should only import from this public API, not from internal module files.

```typescript
// CORRECT: Import from module's public API
import { UUID, Entity } from '@/modules/core';

// INCORRECT: Import directly from module internals
import { UUID } from '@/modules/core/models/base';
```

We've implemented ESLint rules to enforce these boundaries and detect violations using custom scripts.

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

- Created comprehensive event type definitions in the Core module for all React event handlers
- Enhanced WebSocket message types with discriminated unions for domain-specific payloads
- Added type guards for safe runtime discrimination of WebSocket message types
- Added explicit generic type parameters to React hooks (useState, useRef, etc.)
- Used domain types instead of primitives for state variables (e.g., `Banner['status']` vs string)
- Improved typing for callback props and event handlers across components
- Updated context providers with explicit typing for consumers
- Implemented proper return types for custom hooks like `useThemeStyles`
- Strengthened form submission handlers with correct event types
- Enhanced monitoring components to use type-safe WebSocket message handling
- Created scripts to identify import restriction violations across modules
- Enhanced Core module's public API to export all foundational types
- Implemented batch-fix approach to eliminate bridge patterns systematically
- **✅ Completed:** Removed all bridge pattern files and migrated types to proper modules
- **✅ Completed:** Updated all components to import directly from module public APIs
- **✅ Completed:** Created TypeScript versions of architectural enforcement scripts

**Current Progress (Phase 5 - Completed):**

- ✅ Enforced module boundaries through public APIs (index.ts files)
- ✅ Eliminated bridge patterns that were created during architectural evolution
- ✅ Ensured all imports follow the modular monolith architecture principles
- ✅ Systematically fixed import violations across components
- ✅ Removed redundant backup (.bak) files created during refactoring
- ✅ Migrated common event and WebSocket types to Core module
- ✅ Created automated scripts to fix bridge pattern imports
- ✅ Converted cleanup scripts to TypeScript for better maintainability
- ✅ Updated ESLint configuration to better enforce architectural boundaries

**Next Phases:**

1. **Phase 6:** Enhance error handling with proper domain-specific error types
2. **Phase 7:** Complete external integration type declarations
3. **Phase 8:** Implement automated architecture validation in CI/CD pipeline

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

## 🧹 Code Quality, Linting, and Type Safety

- **Strict ESLint Configuration**: The codebase enforces strict architectural boundaries and type safety using ESLint and TypeScript. All cross-module imports must go through module public APIs (`index.ts`) or DTOs. Direct internal imports and bridge files are prohibited and will be flagged by CI.
- **No Bridge Files**: All legacy bridge files (e.g., `src/types/events.ts`, `src/types/websocket.ts`) have been removed. Types must be imported from their module's public API.
- **No Backup/Test Artifacts**: `.bak`, `.old`, and similar backup/test files are not allowed in the codebase and are regularly cleaned up.
- **CI Enforcement**: All PRs must pass lint (`npm run lint`) and type checks (`npm run type-check`). Violations block merges to protected branches.
- **Type Safety**: No `any` types are allowed. Use `unknown` with type guards for dynamic data. All module boundaries use explicit interfaces and DTOs.

#

## ESLint and Type Safety

### Import Rules

The codebase enforces strict module boundaries through ESLint rules:

- No relative imports (use `@/` alias)
- No importing from internal module files (use module public APIs)
- Proper usage of Next.js components (Link, Image)

### Type Safety

- Strong TypeScript typing throughout the codebase
- No use of `any` types
- Proper React component prop interfaces
- Discriminated unions for complex state

### Technical Debt Status

The following areas are flagged for future improvement:

1. **API Bridge Files**: Some unused type exports remain in bridge files as they are referenced indirectly
2. **React Hook Dependencies**: Some components have dependencies that need manual review
3. **Next.js Image Components**: Migration from HTML img tags is in progress
4. **StorefrontEditor TypeScript**: These components need type definition refinement

ESLint is configured with selective overrides to flag these issues appropriately while development continues.

## How to Fix Lint/Type Errors

- **Restricted Import**: Change your import to use the module's public API or DTO file.
- **Unused Variable/Import**: Remove or use the variable/import as needed.
- **Type Error**: Add or refine type annotations, avoid `any`, and use generics or type guards as appropriate.

---

## Theme Structure & Validation

### Theme Interface

- The `Theme` interface is the single source of truth for all theme-related data.
- All theme objects (default, API, user-customized) must match the interface:
  - `colors`: { primary, secondary, accent, background, text, error, success, warning }
  - `typography`, `layout`, `componentStyles` (with all required sub-keys)

### Best Practices

- **Validate** all theme objects before use (especially from API or user input).
- **Update** all theme objects and usages if the interface changes.
- **Unit test** theme transformation logic.
- **Consider runtime validation** (e.g., Zod/Yup) for user-customized themes.

### AI Agent Usage for Theme Audits

- The AI agent can:
  - Audit theme structure across the codebase.
  - Compare interface to all usages in components/hooks.
  - Recommend fixes for missing/extra keys or structure mismatches.
  - Suggest runtime validation and testing strategies.
- Use the agent to:
  - Troubleshoot UI issues related to theming.
  - Validate new theme features or migrations.
  - Document architectural decisions and best practices.

## Conversation Analytics & Dashboard (2025)

### Analytics Aggregation & Reporting

- The backend exposes `/conversation-analytics` (see `backend/app/api/routers/conversation.py`)
  - Returns: total event count, counts by type, counts by day, average response time
  - Supports date range and event type filters
  - Designed for extensibility (add new metrics as needed)

### Dashboard Integration

- The frontend dashboard (`frontend/src/app/dashboard/analytics/page.tsx`) displays:
  - Total conversation events (stat card)
  - Events by type (pie chart)
  - Events by day (line chart)
  - Average response time (stat card)
- Widgets fetch live data from the backend and are ready for further extension (filters, funnel, heatmap, etc.)

### Best Practices

- Add new metrics to the backend endpoint and document them
- Use strict typing and clear API contracts for analytics data
- Visualize new metrics in the dashboard using chart.js or similar
- Keep analytics extensible for future business needs

## Real-Time Monitoring & Alerts (2025)

### WebSocket Monitoring

- Conversation events are broadcast in real time to tenant admins via WebSocket (see `backend/app/core/websocket/monitoring.py` and `backend/app/api/routers/conversation.py`)
- Key events (message sent/read, product clicked, order placed) are pushed to all connected admin clients
- Anomaly detection and alerting can be added to broadcast alerts for issues (e.g., slow response times)

### Dashboard Integration

- The analytics dashboard (`frontend/src/app/dashboard/analytics/page.tsx`) displays a live feed of recent events and alerts
- The frontend subscribes to the WebSocket endpoint and updates the feed in real time

### Best Practices

- Use the WebSocket feed for operational dashboards and proactive monitoring
- Extend the backend to broadcast additional event types or alerts as needed
- Keep the frontend feed performant by limiting the number of displayed events

## Advanced Analytics (2025)

### Sentiment & Intent Analysis

- On every message_sent event, the backend analyzes sentiment (TextBlob) and classifies intent (rule-based)
- Results are stored in the event's payload (see `backend/app/api/routers/conversation.py`)

### Conversation Quality Scoring

- The backend exposes `/conversation-quality` (see `backend/app/api/routers/conversation.py`)
  - Computes a quality score for each conversation based on response time, sentiment, and resolution
  - Results are visualized in the dashboard leaderboard (`frontend/src/app/dashboard/analytics/page.tsx`)

### Anomaly Detection & Alerting

- The backend detects anomalies (slow response, negative sentiment, unresolved >1 day) and broadcasts alerts via WebSocket
- Alerts appear in the real-time dashboard feed

### Best Practices

- Use NLP libraries for deeper analysis as needed
- Tune quality scoring weights and anomaly thresholds for your business
- Extend analytics endpoints and visualizations as new needs arise

# Conversation Event Logging, Analytics, and Clerk Integration (2025)

## Event Logging Architecture

- All significant conversation actions (messages, joins, leaves, closes, etc.) are logged as structured events.
- Event types are defined in both backend (Pydantic/SQLAlchemy) and frontend (TypeScript enums) for strict type safety.
- Events are sent from the frontend using the `ConversationEventLogger` utility, which posts to the `/conversation-events` API.
- Events include `conversation_id`, `user_id`, `tenant_id`, `event_type`, `payload`, and `event_metadata`.

## Clerk Integration for User & Tenant IDs

- The frontend uses Clerk's `useUser` and `useOrganization` hooks to obtain the real user and tenant (organization) IDs.
- These IDs are included in every event log, ensuring multi-tenancy and user attribution.
- Fallback to `user.publicMetadata.tenantId` if the user is not in an organization.

## Analytics & Dashboard

- The backend aggregates events for analytics (volume, type, response time, etc.) and exposes them via `/conversation-analytics`.
- The frontend dashboard visualizes these metrics (stat cards, charts, heatmaps) and provides CSV export.
- Real-time monitoring is enabled via WebSocket, broadcasting key events and alerts to admins.
- The dashboard displays a live feed of recent events and anomalies.

## Event Types

- Supported event types include: `message_sent`, `message_read`, `product_clicked`, `order_placed`, `conversation_started`, `user_joined`, `user_left`, `conversation_closed`.
- New event types can be added in a type-safe manner on both backend and frontend.

## Best Practices

- Always use the ConversationEventLogger for logging events in the frontend.
- Ensure user and tenant IDs are sourced from Clerk context/hooks.
- Extend analytics and monitoring by adding new event types and updating the dashboard as needed.

## 🤝 Trust & Naturalness in Conversational Commerce

Trust is at the heart of commerce in Africa. Our architecture is designed so that buyers and sellers always feel like they're talking to real people, not bots. We prioritize:

- **Authentic, Human-Like Chat:** No "bot speak"—conversations use local language, slang, and context-aware replies.
- **Clear Identity:** Always show who is speaking (buyer, seller, or assistant), but keep automation subtle and helpful.
- **Personalization:** Use names, local expressions, and context to make every chat feel personal.
- **Trust Signals:** Verified badges, clear receipts, and confirmations that look and feel like real commerce.
- **Privacy & Security:** Respect for phone numbers and personal info, with clear opt-in/out for notifications.
- **Seamless Human Escalation:** If a conversation gets stuck, it's easy to talk to a real person—no dead ends.

Our conversational engine is trained on real African chat data, supports local dialects, and is always improving to make commerce feel as natural and trustworthy as chatting with a friend or local vendor.

## Event-Driven Backend, Monitoring, and Alerting (2024-06)

- The backend is now fully event-driven, with all order, payment, and webhook events monitored via Sentry and Prometheus.
- Alerting is automated via Prometheus Alertmanager and WhatsApp for critical events.
- All frontend monitoring and alerting (NotificationCenter, WhatsApp alerts) are integrated with backend events and metrics.
- See backend/README.md and frontend/docs/MONITORING.md for details.

### Analytics, Fulfillment, and Alerting (2024-06)

- Analytics logging is now structured (JSON), fulfillment is event-driven, and alerting is actionable and ready for real integration.
- See backend/README.md and MONITORING.md for details.

## API Versioning (2024-06)

- The backend supports API versioning for all breaking changes.
- `/api/v2/orders/` and other v2 endpoints are available for new or breaking changes.
- See backend/README.md for migration plan and technical details.

### TypeScript Type Safety Standards

#### Type Safety Best Practices for All Developers and AI Assistants

- **No `any` types**: The use of `any` is strictly prohibited. Use explicit interfaces, types, or `unknown` with type guards for dynamic data. All module boundaries must use explicit interfaces. Use generics with constraints for flexible APIs. For record types, use `Record<string, unknown>` instead of `{[key: string]: any}`.

#### Async/Await and Asynchronous Code

- **All asynchronous code must use async/await**: Do not use callbacks or mix sync and async logic in the same function.
- **Error handling is required for all async flows**: Use try/catch around all await calls that can throw.
- **All async functions must be fully typed**: Never use `any` in async function signatures or return types.
- **Async flows must be documented and tested**: All async logic must have corresponding tests and inline comments for complex flows.

## 🧹 2024: Initial Build & Type Safety Enforcement (Summary)

### Achievements
- All `any` types eliminated; replaced with explicit interfaces, generics, or `unknown` with type guards
- All unused variables, imports, and forbidden `require()` usage removed
- All model interfaces (Product, Order, StorefrontComponent, etc.) now require `created_at: string` and use canonical base types
- All bridge files removed; only direct module imports allowed (no `/types/` directory usage)
- All index signature property access (TS4111) and strict optional property errors fixed
- All code is now linter- and type-check compliant; CI blocks merges on violations
- All async code uses async/await with full error handling and type safety
- All code changes are documented and tested

### Canonical Linter/Type Error Resolution
- Use type guards and explicit types instead of non-null assertions or `any`
- Suppress false positive linter/type errors only with line-level comments and clear justification
- Never use file-level disables except for legacy/third-party code
- All test code must be type-safe and use mocks for side-effectful utilities

### Updated Rules for All Contributors & AI Agents
- Never introduce new `any` types or bridge files
- Always use direct module imports and respect module boundaries
- All code must be clean, readable, and well-documented
- All code must pass `npm run lint`, `npm run type-check`, and `npm run verify:architecture`
- All architectural and code quality rules are enforced by CI and documented in this file

## Mock Data & API Integration Best Practices

- All mock data has been removed from the frontend. All UIs (dashboard, messages, products, etc.) must use real backend APIs with strict typing and error handling.
- Only "fake" test purchases for sellers are allowed as mock/test data; all other mock data is prohibited.
- If a widget requires richer analytics than the backend currently provides, use empty arrays/placeholders and leave a clear TODO for backend/API extension.
- Never reintroduce mock data or bridge files. Always use direct module imports and respect module boundaries.

## Type Safety Enforcement

- No `any` types are allowed. Use explicit interfaces, generics, or `unknown` with type guards. All code must be strictly typed and linter/type-check compliant.
- Always use `import type` for type-only imports and import types directly from their module. Never use bridge files or centralized type directories.

### Correct Example
```typescript
import type { Product } from '@/modules/product/models/product';
import { productService } from '@/lib/api';

const products: Product[] = await productService.getProducts();
```

### Incorrect Example
```typescript
import { Product } from '../../types/product'; // ❌ Bridge file - not allowed
const products: any = await getProducts(); // ❌ 'any' type - not allowed
```

## 2024 Product Dashboard & Sharing UX Update

- **Quick Upload:** Mobile-first floating button for instant product upload (photo/video, title, price) on dashboard/products page.
- **Emoji-based Empty State:** 📦 emoji is used for empty product lists (no more broken images).
- **Share Modal:** After upload, sellers can share products via WhatsApp, Instagram, TikTok, or Copy Link using a modal with emoji icons (no external icon dependencies).
- **No pop-up tips or legacy image placeholders remain.**
