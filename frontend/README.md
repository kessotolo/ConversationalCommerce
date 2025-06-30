# ConversationalCommerce Frontend

Mobile-first, modular monolith UI for chat-driven commerce. Built with Next.js, Tailwind, TypeScript, Clerk, and deep WhatsApp integration.

## 🚀 Dev Setup
- See [Onboarding Guide](/docs/ONBOARDING_GUIDE.md)
- `npm install && npm run dev`

## 🧹 2024: Initial Build & Type Safety Enforcement (Summary)

### What We Achieved
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

### Updated Rules for All Contributors
- Never introduce new `any` types or bridge files
- Always use direct module imports and respect module boundaries
- All code must be clean, readable, and well-documented
- All code must pass `npm run lint`, `npm run type-check`, and `npm run verify:architecture`
- All architectural and code quality rules are enforced by CI and documented in this file

## 🚀 Our Core: Commerce in Conversation

This frontend is designed to make commerce in conversation the default experience. Every feature—product discovery, cart, checkout, upsell—can be driven by chat, reflecting how Africans do commerce. The webapp is a complement for those who want it, but the primary channel is always the conversation. All UI, APIs, and analytics are built to support seamless chat-driven commerce.

## 🌐 Frictionless Entry Points for Conversational Commerce

To make commerce as seamless as chatting with a friend, the platform supports and plans to support a wide range of modern entry points:

- **QR Codes**: Scan to start a chat, buy a product, or join a group. Used on packaging, posters, receipts, and more.
- **NFC Tags & Smart Posters**: Tap your phone on a market stall, product, or poster to instantly start a conversation.
- **Deep Links & App Clips/Instant Apps**: One-tap links that launch WhatsApp, IG, or your app with pre-filled context—no install required.
- **SMS Short Codes & Keywords**: Text a memorable code or keyword to start shopping, even on feature phones.
- **Voice Activation & Audio Triggers**: Use voice commands or audio watermarks in ads to launch a shopping chat.
- **Social Referral Links**: Shareable links and receipts that let friends buy what you bought, with full context.
- **Visual Search & Image Recognition**: Snap a photo of a product or friend's item to start a shopping conversation.
- **Location-Based Triggers**: Geofenced notifications or Bluetooth beacons that prompt a chat when near a store or market.
- **Offline-to-Online Bridges**: USSD codes, SMS fallbacks, and scratch-off cards for users with limited connectivity.
- **Phone Numbers**: Phone numbers are a first-class identifier for users and sellers, enabling SMS, WhatsApp, and voice flows.

**African Context:** The platform is designed to combine these approaches, adapting to urban and rural realities. QR codes and phone numbers are first-class, but the system is extensible to all modern entry points, ensuring everyone can join the conversation—no matter their device or connectivity.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app). The frontend implements a mobile-first design optimized for African markets with WhatsApp integration and multilingual support.

## 🤝 Trust & Naturalness in Conversational Commerce

Trust is at the heart of commerce in Africa. Our frontend is designed so that buyers and sellers always feel like they're talking to real people, not bots. We prioritize:

- **Authentic, Human-Like Chat:** No "bot speak"—conversations use local language, slang, and context-aware replies.
- **Clear Identity:** Always show who is speaking (buyer, seller, or assistant), but keep automation subtle and helpful.
- **Personalization:** Use names, local expressions, and context to make every chat feel personal.
- **Trust Signals:** Verified badges, clear receipts, and confirmations that look and feel like real commerce.
- **Privacy & Security:** Respect for phone numbers and personal info, with clear opt-in/out for notifications.
- **Seamless Human Escalation:** If a conversation gets stuck, it's easy to talk to a real person—no dead ends.

Our conversational engine is trained on real African chat data, supports local dialects, and is always improving to make commerce feel as natural and trustworthy as chatting with a friend or local vendor.

## 🌍 African Market Performance Optimizations

This application is specifically optimized for users in African markets where connectivity may be limited:

- **Dynamic Imports**: Non-critical components use lazy loading to reduce initial bundle size
- **Offline Resilience**: Theme settings are cached in localStorage for use during connectivity issues
- **Network Status Detection**: Visual indicators inform users when they're offline
- **Retry Mechanism**: API calls implement retries with graceful fallbacks
- **Loading States**: Skeleton loading placeholders improve perceived performance
- **Error Boundaries**: Proper error handling ensures the application remains usable during failures
- **Non-blocking Notifications**: Toast notifications replace blocking alerts for better UX

## 🏗️ Modular Monolith Architecture

The frontend follows a modular monolith architecture with the following key components:

### Module Structure

The codebase is organized into distinct modules with clear boundaries:

- **Core**: Base types, utilities, and cross-cutting concerns
- **Tenant**: Merchant configuration and management
- **Conversation**: Messaging system for customer engagement
- **Product**: Product catalog management
- **Order**: Order processing and transactions
- **Storefront**: Storefront configuration and customization
- **Theme**: Theming engine and configuration
- **Monitoring**: System monitoring and alerts

Each module contains its own:

- **Models**: Domain models and types
- **Services**: Business logic and data access
- **Components**: UI components specific to the module
- **Utils**: Helper functions for the module
- **API**: For modules that interact with backend APIs, API functions are placed in an `api/` subdirectory. For example, all onboarding-related API calls (startOnboarding, submitKYC, setDomain, inviteTeam, uploadKYCFile) are implemented in `src/modules/tenant/api/onboardingApi.ts`. Components and tests should import onboarding API functions from this module. This enables clean separation of concerns, testability, and strict adherence to module boundaries.

### Module Boundaries

The following defines which modules can import from which others:

- **Core**: Cannot import from other modules (base module)
- **Tenant**: Can import from Core
- **Conversation**: Can import from Core, Tenant
- **Product**: Can import from Core, Tenant
- **Order**: Can import from Core, Tenant, Product
- **Storefront**: Can import from Core, Tenant, Product, Order
- **Theme**: Can import from Core, Tenant
- **Monitoring**: Can import from Core

### Core Domain Models

#### Type System Structure

- **Foundational types** located at `src/modules/core/models/base.ts` form the backbone of our type system
- **Domain-specific types** should extend these base types for consistency and maintainability
- **Path aliases** available in tsconfig.json allow for cleaner imports via `@/modules/core/models/base`

#### Core Types

- **UUID**: `type UUID = string` - standardized ID type used across backend and frontend
- **Entity**: Base interface with `id`, `created_at`, and `updated_at` properties
- **TenantScoped**: Extends Entity with `tenant_id` for multi-tenant data
- **Draftable**: Extends Entity with draft/publish workflow properties
- **Money**: Type for currency operations with amount and currency code
- **Result<T>**: Error handling pattern for consistent API responses
- **PaginatedResult<T>**: Standard wrapper for paginated data collections
- **Status**: Common enum for entity statuses (active, draft, published, etc.)

#### Import Guidelines

```typescript
// CORRECT: Direct module imports with type imports where appropriate
import type { UUID, Entity } from '@/modules/core/models/base';
import { Status } from '@/modules/core/models/base';
import type { Banner } from '@/modules/storefront/models/banner';

// INCORRECT: Relative imports crossing module boundaries
// import { UUID } from '../../modules/core/models/base';
// import { Banner } from '../../../types/storefrontEditor'; // Bridge pattern - avoid!

// CORRECT: Direct API imports using @ alias
import { getDrafts, publishDraft } from '@/lib/api/storefrontEditor';

// Extend base types for domain models
export interface Product extends TenantScoped {
  name: string;
  description: string;
  price: number;
  // No need to specify id, tenant_id, created_at, updated_at
}

// Use PaginatedResult for list types
export type ProductList = PaginatedResult<Product>;
```

#### Import Refactoring and Type Safety Progress

We're making significant progress in our systematic refactoring of imports and type safety improvements:

- **Phase 1 ✅**: Converted all StorefrontEditor components to use absolute imports with the `@` alias
- **Phase 2 ✅**: Fixed cross-module imports in library files (`/lib/cart.ts`, `/lib/api/storefrontEditor.ts`, `/lib/api.ts`)
- **Phase 3 ✅**: Standardized component and hook imports, eliminated all `any` types and improved type safety
- **Phase 4 ✅**: Fixed context-related imports in provider components and inter-context dependencies
- **Phase 5 ✅**: Eliminated bridge patterns and enforced module boundaries through public APIs
  - Removed legacy bridge pattern files from `/types/` directory
  - Migrated common types to appropriate modules (event and WebSocket types to core module)
  - Created scripts to automate import fixing from bridge files to module public APIs
  - Enhanced Core module public API with proper type exports
  - Fixed ESLint configuration to enforce architectural boundaries

**🚀 Progress: 90%** - We've successfully completed the architectural cleanup by enforcing module boundaries and public APIs.

#### Import Best Practices

- Always use absolute imports with the `@` alias (`@/modules/core/models/base`)
- Never use relative imports for cross-module references (`../module/file`)
- Import only what you need - avoid namespace imports (`* as X`)
- Keep imports organized and consistent
- Consider using `type` imports for type-only dependencies

### TypeScript Type Safety Standards

To maintain code quality and prevent runtime errors, we follow strict type safety standards:

#### Core Type Safety Principles

- **No `any` types**: The use of `any` is strictly prohibited. Use explicit interfaces, types, or `unknown` with type guards for dynamic data. All module boundaries must use explicit interfaces. Use generics with constraints for flexible APIs. For record types, use `Record<string, unknown>` instead of `{[key: string]: any}`.

#### Async/Await and Asynchronous Code

- **All asynchronous code must use async/await**: Do not use callbacks or mix sync and async logic in the same function.
- **Error handling is required for all async flows**: Use try/catch around all await calls that can throw.
- **All async functions must be fully typed**: Never use `any` in async function signatures or return types.
- **Async flows must be documented and tested**: All async logic must have corresponding tests and inline comments for complex flows.

#### Type Safety Automation

- TypeScript compiler is configured with `strict: true` and `noImplicitAny: true`
- ESLint enforces the `@typescript-eslint/no-explicit-any` rule
- PRs are automatically checked for type coverage
- Type violations block merges to protected branches

#### Guidelines for AI Assistants

AI assistants working with this codebase MUST adhere to these guidelines:

1. Never introduce new `any` types into the codebase
2. Always provide proper type definitions for functions, variables, and objects
3. Use `unknown` with type guards rather than `any` for dynamic data
4. Respect module boundaries and use appropriate domain model types
5. Favor generics with constraints over loose typing
6. Document complex type decisions with clear comments
7. Suggest type improvements when encountering existing `any` usage

Failing to follow these guidelines will result in PR rejections and potential type regressions.

### Type Safety Improvement Plan

We are implementing a phased approach to eliminate all `any` types from the codebase:

#### Phase 1: Core Models & Type Foundations ✅ COMPLETE (June 2025)

**Goal:** Eliminate `any` from foundational models to prevent type leaks and improve downstream type safety.

**Completed Actions:**

- Replaced all `any` and `Record<string, any>` in core models with explicit interfaces, generics, and discriminated unions
- Implemented `FilterOption<T>` and `FilterGroup<T>` using generics instead of `any`
- Replaced dynamic objects with `Record<string, unknown>` for improved type safety
- Added proper documentation for complex type decisions
- Created specific interfaces like `BaseDetails` for previously untyped objects

#### Phase 2: API Layer – DTOs, Consistency, and Service Integration ✅ COMPLETE (June 2025)

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

#### Phase 3: Component Props, Hooks, and Contexts ✅ COMPLETE (June 2025)

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

### Module Structure

The application is organized into domain-specific modules, each with a consistent internal structure:

```
src/modules/
├── core/              # Foundational types and utilities
│   ├── models/        # Base type definitions
│   ├── services/      # Core services
│   └── utils/         # Shared utilities
├── tenant/            # Merchant management
│   ├── models/        # Tenant-specific types
│   ├── services/      # Tenant services
│   └── components/    # Tenant-specific UI
├── conversation/      # Messaging functionality
├── product/           # Product catalog
└── order/             # Order processing
```

#### Module Organization Guidelines

- Each module should maintain its own models directory for domain-specific types
- Domain types should extend core types (Entity, TenantScoped, etc.)
- Types should be organized by domain concept, not by UI component
- Avoid circular dependencies between modules
- Use path aliases for cleaner imports (`@core/*`, `@tenant/*`, etc.)

### Service Layer

- Service interfaces and concrete implementations for each module
- Includes TenantService, ConversationService, ProductService, OrderService

### Dependency Injection

- ServiceRegistry and ServiceInitializer manage dependencies between modules
- Ensures proper module boundaries while maintaining a monolithic deployment

### React Integration

- ServiceProvider React context makes services accessible throughout the component tree
- Custom hooks for accessing module services

## Type System Migration & Best Practices

### Migration Status

We've consolidated our type system following this priority order:

1. **UUID Type**: Standardized ID type used across all models
2. **Entity and TenantScoped**: Base interfaces for consistent domain modeling
3. **PaginatedResult**: Standard pattern for all paginated data
4. **Domain-Specific Types**: Updated by module (Storefront, Monitoring, Theme, etc.)

### Type Checking

For strong type checking, run the TypeScript compiler:

```bash
npm run type-check  # Runs tsc --noEmit to check types without emitting files
```

### Future Improvements

- **Runtime Validation**: Consider adding Zod schemas to validate data at runtime
- **API Type Generation**: Automate type generation from backend OpenAPI specs
- **Strict Null Checks**: Enable strictNullChecks in tsconfig.json for better null safety
- **Module Boundary Types**: Define clear interface types for cross-module communication
- **Type Tests**: Add test cases to verify type compatibility with backend models

## Technical Requirements

### Authentication System

- **Clerk Integration**: Secure authentication using Clerk with custom session management
- **Role-Based Access**: Different interfaces and permissions for sellers and admin users
- **Centralized Auth Utilities**: Custom auth-utils.tsx providing consistent authentication throughout the application

### Database UUID Standardization

- **UUID-Based Keys**: All models standardized on UUID types for database primary and foreign keys
- **PostgreSQL Native UUIDs**: Using PostgreSQL's UUID data type (UUID(as_uuid=True)) instead of string representations
- **Consistent Database Relationships**: Proper one-to-one relationships between models (e.g., Tenant and StorefrontConfig)

### Next.js App Router

- **Client and Server Components**: Proper separation of client and server components
- **Dynamic Routing**: Type-safe parameter handling in dynamic routes
- **Authentication Middleware**: Custom middleware for tenant identification and authentication

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Multi-Tenancy & Tenant Resolution

This application supports multi-tenancy through a comprehensive tenant resolution system:

### Subdomain Generation

When a seller registers, the system automatically generates a subdomain from their business name:

- Subdomains are created by converting the business name to lowercase, replacing spaces with hyphens, and removing special characters
- If a subdomain is already taken, a number or random string is appended (e.g., "joes-coffee-2")
- Each store is accessible via its subdomain (e.g., `joes-coffee.yourplatform.com`)

### Custom Domain Support

Sellers can also point their purchased domains to their storefront:

- The platform detects both subdomain and custom domain access
- Domain ownership verification is done via DNS records
- Stores are accessible via both their subdomain and custom domain

### Storefront Management

The dashboard provides a comprehensive interface for managing and viewing storefronts:

- **Customize Storefront**: Access via the sidebar to edit storefront settings and appearance
- **View Live Storefront**: Direct link to the public-facing storefront with clear visual indicators
- **Smart Placeholder Handling**: System provides guidance when using placeholder or default domains
- **Enhanced UI**: Color-coded action buttons with improved accessibility and user experience

### Development Testing

For local development and testing:

```
# Test with a specific tenant
http://localhost:3000?subdomain=tenant1

# Default tenant
http://localhost:3000
```

### Implementation Architecture

- **Middleware**: Detects the access method (subdomain vs custom domain)
- **Context Provider**: Makes tenant info available throughout the app
- **Theme System**: Loads tenant-specific themes based on tenant resolution
- **UUID Support**: All models use PostgreSQL UUID types for primary and foreign keys

### Future Implementations

- Admin interface for sellers to manage their custom domains
- Automatic SSL certificate provisioning for custom domains
- DNS configuration wizard for sellers
- Enhanced storefront customization options

## Storefront Editor

The Storefront Editor is a comprehensive tool that allows sellers to customize and manage their storefronts. It follows a modular architecture with several interconnected components.

### Core Components

#### StorefrontEditor

The main container component that provides a tabbed interface for accessing different editing features:

- **Asset Management**: Upload and manage media assets
- **Draft Management**: Create and manage draft configurations
- **Version History**: Track and restore previous versions
- **Permissions**: Manage user roles and access control
- **Banner & Logo Management**: Create and manage visual elements

### Data Flow Architecture

The Storefront Editor follows a clear data flow pattern:

1. **API Layer**: Located in `src/lib/api/storefrontEditor.ts`
2. **Type Definitions**: Located in `src/types/storefrontEditor.ts`
3. **Component Layer**: Organized in `src/components/StorefrontEditor/`

All API requests use UUID identifiers for consistency with the backend PostgreSQL implementation.

### Banner & Logo Management

This feature provides a unified interface for managing visual elements of the storefront.

#### BannerLogoManagement

A tabbed interface that switches between Banner and Logo management:

```
BannerLogoManagement
├── BannerManagement (Tab 1)
│   ├── BannerList
│   ├── BannerDetail
│   └── CreateBannerModal
└── LogoManagement (Tab 2)
    ├── LogoList
    ├── LogoDetail
    └── CreateLogoModal
```

#### Banner Management Features

- Create, edit, publish, and delete banners
- Filter banners by type, status, and search term
- Schedule banners with start/end dates
- Target specific audience segments
- Reorder banners via drag-and-drop
- Select from uploaded assets for banner images

#### Logo Management Features

- Manage different logo types (primary, secondary, footer, mobile, favicon)
- Schedule logos with start/end dates
- View and filter the logo collection
- Select from uploaded assets for logo images
- Configure display settings for responsive behavior

### Dependencies

The Storefront Editor uses the following key libraries:

- **@headlessui/react**: For accessible UI components like tabs, modals, and dropdowns
- **@heroicons/react**: For consistent iconography throughout the interface
- **react-dnd**: For drag-and-drop functionality in banner ordering
- **react-dnd-html5-backend**: HTML5 backend for react-dnd
- **axios**: For API requests with proper error handling

### Permissions Model

The editor implements a role-based access control system with four primary roles:

- **Viewer**: Can view storefront configurations but not edit
- **Editor**: Can create and edit drafts but not publish
- **Publisher**: Can publish drafts to live storefronts
- **Admin**: Has full access including user permission management

Permissions can be scoped to specific sections (themes, layouts, content, etc.) for fine-grained access control.

## Deployment

### Build Process

```bash
# Build the application for production
npm run build

# Start the production server
npm start
```

### UUID Migration Considerations

The application has standardized on UUID types for database primary and foreign keys. During deployment, be aware of the following:

1. **Database Schema**: Ensure your PostgreSQL database supports the migration from String-based UUIDs to native UUID data types
2. **Data Migration**: Use the provided migration scripts to convert existing String UUIDs to native PostgreSQL UUIDs
3. **API Consistency**: All API endpoints have been updated to expect and return properly formatted UUIDs

### Authentication Deployment Notes

1. **Environment Variables**: Ensure all Clerk-related environment variables are properly set in your deployment environment
2. **Middleware Configuration**: The authentication middleware is configured to handle multi-tenancy with UUID-based tenant identification
3. **Client/Server Component Separation**: The application properly separates client and server components for optimal performance

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.

## 🧹 2024: Initial Build & Type Safety Enforcement (Summary)

### What We Achieved
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

### Updated Rules for All Contributors
- Never introduce new `any` types or bridge files
- Always use direct module imports and respect module boundaries
- All code must be clean, readable, and well-documented
- All code must pass `npm run lint`, `npm run type-check`, and `npm run verify:architecture`
- All architectural and code quality rules are enforced by CI and documented in this file

# Conversation Event Logging, Analytics, and Clerk Integration

## Event Logging

- All key conversation actions (messages, joins, leaves, closes, etc.) are logged as structured events.
- Use the `ConversationEventLogger` utility to send events to the backend `/conversation-events` endpoint.
- Events include `conversation_id`, `user_id`, `tenant_id`, `event_type`, `payload`, and `event_metadata`.

## Clerk Integration

- The frontend uses Clerk's `useUser` and `useOrganization` hooks to get the real user and tenant (organization) IDs.
- These IDs are included in every event log for multi-tenancy and user attribution.
- If the user is not in an organization, fallback to `user.publicMetadata.tenantId`.

## Analytics & Dashboard

- The backend aggregates events for analytics and exposes them via `/conversation-analytics`.
- The dashboard visualizes metrics (event volume, type, response time, etc.) and supports CSV export.
- Real-time monitoring is enabled via WebSocket, broadcasting key events and alerts to admins.
- The dashboard displays a live feed of recent events and anomalies.

## Event Types

- Supported event types: `message_sent`, `message_read`, `product_clicked`, `order_placed`, `conversation_started`, `user_joined`, `user_left`, `conversation_closed`.
- New event types can be added in a type-safe manner on both backend and frontend.

## 🔐 Authentication Architecture

The application implements a clean, build-safe authentication architecture using Clerk that follows modular monolith principles:

### Build-Safe Authentication

The authentication system is designed to work seamlessly during both development and build time without hacky scripts or file modifications:

- **SafeClerkProvider**: A wrapper around Clerk's `ClerkProvider` that safely handles build-time scenarios

  - Located in `src/utils/auth/clerkProvider.tsx`
  - Detects build-time environment via environment variables
  - Renders children without Clerk during build to avoid errors
  - Used in both App Router (`src/app/providers.tsx`) and Pages Router (`pages/_app.tsx`)

- **Core Authentication Service**:

  - Located in `src/modules/core/services/auth/buildSafeAuth.ts`
  - Follows the Result pattern from core domain models
  - Provides safe default values during build time
  - Implements proper error handling and type safety

- **Domain-Driven Authentication Hooks**:
  - Located in `src/modules/core/hooks/useAuth.ts`
  - Provides a clean domain interface for authentication
  - Returns properly typed user information
  - Abstracts away Clerk implementation details
  - Consistent API across Pages and App Router

### Authentication Middleware

The middleware (`middleware.ts`) handles tenant identification and authentication:

- Extracts tenant identifiers from subdomains or custom domains
- Sets tenant info in request headers and cookies
- Defines public routes that bypass authentication
- Skips authentication checks during build time by detecting environment variables
- Does not modify source files during build

### Deployment Configuration

Deployment configuration is simplified through environment variables:

```toml
# In netlify.toml
[build.environment]
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = ""
CLERK_SECRET_KEY = ""
```

This approach disables Clerk during builds without modifying source files.

### How to Add New Auth-Protected Routes

1. Use the `useAuth` hook from core domain:

   ```typescript
   import { useAuth } from '@/modules/core/hooks/useAuth';

   export default function ProtectedPage() {
     const { user, isAuthenticated, isLoading } = useAuth();

     if (isLoading) return <LoadingIndicator />;
     if (!isAuthenticated) return <Redirect to="/sign-in" />;

     return <YourProtectedContent user={user} />;
   }
   ```

2. For server-side authentication checks, use the `checkAuth` function:

   ```typescript
   import { checkAuth } from '@/modules/core/hooks/useAuth';

   export async function getServerSideProps(context) {
     const authResult = await checkAuth(context.req);

     if (!authResult.success) {
       return {
         redirect: {
           destination: '/sign-in',
           permanent: false,
         },
       };
     }

     return {
       props: { user: authResult.data },
     };
   }
   ```

## Best Practices

- Always use the ConversationEventLogger for logging events in the frontend.
- Ensure user and tenant IDs are sourced from Clerk context/hooks.
- Use the core domain's `useAuth` hook instead of direct Clerk hooks for better architectural consistency.
- Never disable authentication during build time by modifying source files; use environment variables instead.
- Extend analytics and monitoring by adding new event types and updating the dashboard as needed.

### TypeScript, Type Safety, and Module Boundaries

- All modules use strict TypeScript with strong typing enforced via interfaces, enums, and type guards.
- Direct module imports are required; bridge files and relative imports across module boundaries are prohibited (see ESLint rules).
- All domain models (e.g., Product, Banner, Logo, Asset, Permission) are defined in their respective module directories and exported via public APIs.
- Enum values (e.g., BannerStatus, LogoType) are aligned with backend DTOs for consistency.
- Type guards are used for all unknown/any API responses and event payloads.

### Error Handling

- All API/service errors are handled using the `parseApiError` utility from `/lib/utils.ts` for consistent, user-friendly error messages.
- Example:

```typescript
import { parseApiError } from '@/lib/utils';

try {
  await someApiCall();
} catch (error) {
  setError(parseApiError(error));
}
```

### Event Logging & Analytics

- All major actions (asset changes, banner/logo updates, permission changes, etc.) are logged as structured events using a type-safe event logger.
- Events include user and tenant IDs for accurate attribution and analytics.
- Event logging is extensible; new event types can be added as needed.

### Removal of Bridge Files

- All bridge files and legacy type/model aggregators have been removed.
- Types/interfaces must be imported directly from their module's public API.

## Monitoring, Audit Log, and Alerts

### Audit Log Table

- The `AuditLogTable` component displays all conversation-related audit log entries for the current tenant.
- Integrate it into any dashboard or monitoring page by passing the `tenantId` prop.
- Example usage:

```tsx
import AuditLogTable from 'src/components/monitoring/AuditLogTable';

const tenantId = localStorage.getItem('tenant_id') || '';

<AuditLogTable tenantId={tenantId} />;
```

### Alerts & Notifications

- The `NotificationCenter` component displays real-time or recent alerts for the tenant.
- Integrate it into your dashboard to show event-based alerts (e.g., high-priority events, errors, or custom triggers).
- Example usage:

```tsx
import NotificationCenter from 'src/components/monitoring/NotificationCenter';

<NotificationCenter />;
```

### Event-Based Monitoring

- Conversation events are now automatically logged to the audit log and can trigger alerts based on tenant configuration.
- See the backend documentation for configuring alert rules and audit log integration.

## WhatsApp Alerting & Seller WhatsApp Number Management

- Sellers can set or update their WhatsApp number in the dashboard (Settings > General tab).
- Alerts for critical events (e.g., new orders, complaints) are sent to the seller's WhatsApp via Twilio.
- The WhatsApp number is stored in the tenant profile and can be updated at any time.
- API endpoints: `GET /tenants/me` (fetch profile), `PATCH /tenants/me` (update WhatsApp number).
- Test by updating the number and triggering an alert event.

## Backend Migrations

- All backend database migrations are managed using Alembic in the backend directory. See `backend/README.md` for workflow and troubleshooting.

- The backend order system uses an event-driven architecture for notifications, analytics, and fulfillment. See backend/docs/api/orders.md for event types and details.

- Payment events (e.g., PaymentProcessedEvent) are now part of the backend event system. See backend/docs/api/orders.md for details.

## Backend Event-Driven Architecture & Monitoring (2024-06)

- The backend is now fully event-driven and monitored with Sentry and Prometheus. All order, payment, and webhook failures are tracked and alertable.
- Frontend monitoring and alerting (NotificationCenter, WhatsApp alerts) are fully integrated with backend events and metrics.
- See backend/README.md and frontend/docs/MONITORING.md for details.

## Backend API Versioning (2024-06)

- The backend supports API versioning for all breaking changes.
- `/api/v2/orders/` and other v2 endpoints are available for new or breaking changes.
- Frontend should consume v2 endpoints for new features or breaking changes.
- See backend/README.md for details.

## 💬 Conversational Checkout & WhatsApp Integration (2025-06)

The primary buyer experience is chat-driven, powered by the backend chat flow engine and WhatsApp integration. The frontend is a complement for sellers/admins and can be extended to simulate chat for testing.

### How It Works

- Buyers interact via WhatsApp (or SMS/Telegram) and are guided through a step-by-step checkout: name → phone → address → payment method → confirm.
- The backend validates input, manages state, and generates real payment links.
- All chat state and order/payment events are logged for analytics and audit.

### Extending the Frontend

- If needed, a minimal chat simulator UI can be built to POST messages to the backend WhatsApp webhook for local testing.
- All seller/admin dashboards and analytics reflect chat-driven orders/payments in real time.

### Key Backend Files

- See backend `app/conversation/chat_flow_engine.py` and `app/api/v1/endpoints/whatsapp.py` for chat flow and WhatsApp integration logic.

# Frontend Modules Overview

## core

**Purpose:** Base types, utilities, and cross-cutting concerns for the frontend.
**Allowed Imports:** None (cannot import from other modules).
**Forbidden Imports:** All other modules.
**Example Import Patterns:**
// ✅ Correct
import type { UUID } from '@/modules/core/models/base';
// ❌ Incorrect
import { OrderService } from '@/modules/order/services/OrderService';
**Analytics/Event Logging:** Not applicable.
**Testing:** See /core/tests/unit and /core/tests/integration.

## conversation

**Purpose:** Messaging UI and conversational flows.
**Allowed Imports:** core, tenant.
**Forbidden Imports:** product, order, storefront, theme, monitoring.
**Example Import Patterns:**
// ✅ Correct
import { ConversationEventType } from '@/modules/conversation/models/event';
// ❌ Incorrect
import { ProductService } from '@/modules/product/services/ProductService';
**Analytics/Event Logging:** Use ConversationEvent pattern for all analytics and monitoring.
**Testing:** See /conversation/tests/unit and /conversation/tests/integration.

## order

**Purpose:** Order processing and transaction flows.
**Allowed Imports:** core, tenant, product.
**Forbidden Imports:** Should not import from unrelated modules.
**Example Import Patterns:**
// ✅ Correct
import { Order } from '@/modules/order/models/order';
// ❌ Incorrect
import { ThemeService } from '@/modules/theme/services/ThemeService';
**Analytics/Event Logging:** Use ConversationEvent pattern where applicable.
**Testing:** See /order/tests/unit and /order/tests/integration.

---

For more details, see AI_AGENT_CONFIG.md.

## Testing

### Overview

The application has a comprehensive test suite covering unit, integration, and component tests. Tests are located within their respective module directories.

### Running Tests

```bash
# Run all tests
npm test

# Run tests with verbose output
npm test -- --verbose

# Run a specific test file
npm test -- src/modules/tenant/components/OnboardingWizard.test.tsx
```

### Test Documentation

For detailed information about the testing approach and best practices:

- See `/tests/README.md` for quick guidance on testing best practices
- See `/docs/TEST_FIXES_SUMMARY.md` for details on recent test suite updates

### Test Structure

Tests are organized as follows:

- **Unit Tests**: Located in `src/modules/*/tests/unit/`
- **Integration Tests**: Located in `src/modules/*/tests/integration/`
- **Component Tests**: Located alongside the components they test

## Navigation

- Uses a modern, mobile-first `MobileNav` component (see `src/components/MobileNav.tsx`).
- `MobileNav` is a client component (uses React hooks, Clerk auth) and must include the `"use client"` directive.
- On mobile, the admin dashboard uses a sticky bottom nav for quick access.
- The old `Navbar` is deprecated and replaced by `MobileNav` everywhere.

## Onboarding Experience

- After sign in/up, users land on the dashboard (not a blocking wizard).
- If onboarding is incomplete, a prominent, dismissible onboarding card appears at the top of the dashboard (web & mobile).
- The onboarding card shows progress, a "Continue Onboarding" button (opens modal wizard), and a dismiss (X) button.
- The onboarding wizard is accessible as a modal from the card, and progress is saved.
- This "soft onboarding" matches best-in-class SaaS UX (Shopify-style).

## Customization & Extensibility

- To change onboarding steps, edit `OnboardingWizard` in `src/modules/tenant/components/OnboardingWizard.tsx`.
- To customize the onboarding prompt card, see `src/components/dashboard/OnboardingPromptCard.tsx`.
- To update navigation, edit `MobileNav.tsx`.

## Notes

- All navigation and onboarding flows are mobile-first and accessible.
- The onboarding prompt logic is ready to connect to a real backend status API.
- For more, see the module-level README in `src/modules/tenant/components/README.md`.

## 🧹 2024: Initial Build & Type Safety Enforcement (Summary)

### What We Achieved
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

### Updated Rules for All Contributors
- Never introduce new `any` types or bridge files
- Always use direct module imports and respect module boundaries
- All code must be clean, readable, and well-documented
- All code must pass `npm run lint`, `npm run type-check`, and `npm run verify:architecture`
- All architectural and code quality rules are enforced by CI and documented in this file

## API Integration & Mock Data Policy

- All mock data has been removed from the frontend. All UIs (dashboard, messages, products, etc.) are now wired to real backend APIs with strict typing and error handling.
- Only "fake" test purchases for sellers are allowed as mock/test data; all other mock data is prohibited.
- All code must be strictly typed and linter/type-check compliant. No `any` types, no bridge files, and no centralized type directories are allowed.
- Always use direct module imports and respect module boundaries. Never import from internal files or bridge files.
- All async code uses async/await with try/catch for error handling. All async functions are fully typed. Loading, error, and empty states are handled in all UIs.

## How to Extend the Dashboard

- When adding new widgets or analytics, always use real backend APIs. If the backend does not yet provide the required data, use empty arrays/placeholders and leave a clear TODO for backend/API extension.
- Never reintroduce mock data or bridge files. Always use direct module imports and respect module boundaries.
- Document all architectural or type changes in the appropriate `.md` files.
- Use the provided scripts and CI checks to verify architecture and type safety.
- Coordinate backend and frontend changes for type safety when extending analytics or dashboard features.

## Linter, Typing, and Import Rules

- Run `npm run verify:architecture`, `npm run lint`, and `npm run type-check` before every commit.
- All code must be strictly typed and linter/type-check compliant. No `any` types, no bridge files, and no centralized type directories are allowed.
- Always use direct module imports and respect module boundaries. Never import from internal files or bridge files.

## ESLint Fix Scripts

This directory contains scripts for fixing ESLint issues across the codebase:

### Primary Scripts

- **fix-architectural-issues.js**: Fixes imports to respect modular architecture boundaries
- **fix-unused-variables.js**: Removes or comments out unused variables and imports
- **fix-hook-dependencies.js**: Fixes React Hook dependency arrays
- **fix-nextjs-images.js**: Replaces HTML img tags with Next.js Image components
- **fix-typescript-parsing-errors.js**: Fixes TypeScript parsing errors, especially in StorefrontEditor components

### Running the Scripts

```bash
# Make script executable
chmod +x scripts/script-name.js

# Run the script
node scripts/script-name.js
```

### Remaining Issues

Some issues are handled via ESLint configuration overrides in .eslintrc.js rather than code changes:

1. Unused variables in API bridge files (transitional technical debt)
2. Legacy JSX files (pending migration to TypeScript)
3. React Hook dependency warnings in some monitoring components (need manual review)
4. HTML img tags still present in some components (pending Next.js Image migration)

See the project architecture documentation for more details on the modular boundaries being enforced.

## 🛠️ Build & Onboarding/KYC Review

- To build the frontend: `npm install && npm run build`
- The onboarding wizard guides sellers through business info, KYC, domain, and team invite steps.
- Admins can review and approve/reject KYC requests at `/admin/monitoring`.
- All onboarding and KYC actions are logged for analytics and audit.

## ⚡ Coding Principles

- For all new frontend features and UI components, **prefer using shadcn/ui primitives**. Existing custom UI kit can be maintained for legacy code, but new work should use shadcn/ui for consistency, accessibility, and maintainability.
