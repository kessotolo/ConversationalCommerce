# Conversational Commerce Frontend

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app). The frontend implements a mobile-first design optimized for African markets with WhatsApp integration and multilingual support.

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

#### Best Practices
- Always import types from `@core/models/base` instead of redefining them
- Domain types should extend Entity, TenantScoped, or Draftable as appropriate
- Use PaginatedResult<T> for all paginated list responses
- Organize domain models within their respective module directories (e.g., `@product/models/*`)
- Prefer composition over inheritance for complex types

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
