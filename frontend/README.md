# Conversational Commerce Frontend

This is a [Next.js](https://nextjs.org) project implementing a comprehensive modular monolith architecture optimized for African markets with WhatsApp integration and multilingual support.

## Modular Monolith Architecture

The Conversational Commerce platform uses a modular monolith architecture that combines the benefits of a monolithic deployment with clear module boundaries and separation of concerns.

### Architecture Overview

```
src/
└── modules/
    ├── core/                  # Base types, interfaces, and cross-cutting concerns
    │   ├── models/            # Core domain entities and value objects
    │   ├── services/          # Base service interfaces and service registry
    │   └── components/        # Shared UI components and context providers
    │
    ├── tenant/                # Tenant (merchant) management module
    │   ├── models/            # Tenant domain models
    │   ├── services/          # Tenant-specific services
    │   └── components/        # Tenant management UI components
    │
    ├── conversation/          # Messaging and chat functionality module
    │   ├── models/            # Conversation and messaging models
    │   ├── services/          # Conversation services
    │   └── components/        # Chat UI components
    │
    ├── product/               # Product catalog module
    │   ├── models/            # Product, category, and collection models
    │   ├── services/          # Product management services
    │   └── components/        # Product display and management components
    │
    ├── order/                 # Order processing module
    │   ├── models/            # Order and transaction models
    │   ├── services/          # Order management services
    │   └── components/        # Order management UI components
    │
    ├── payment/               # Payment processing module (placeholder)
    │   ├── models/            # Payment models
    │   ├── services/          # Payment services
    │   └── components/        # Payment UI components
    │
    ├── security/              # Security and authentication module (placeholder)
    │   ├── models/            # Security models
    │   ├── services/          # Security services
    │   └── components/        # Security UI components
    │
    └── storefront/            # Customer-facing storefront module (placeholder)
        ├── models/            # Storefront models
        ├── services/          # Storefront services
        └── components/        # Storefront UI components
```

### Key Architecture Principles

1. **Module Boundaries**: Each module encapsulates its own models, services, and components
2. **Domain-Driven Design**: Models represent core business entities and value objects
3. **Dependency Injection**: Services are registered and retrieved through a central registry
4. **Separation of Concerns**: Clear distinction between models, services, and UI components
5. **Standard Interfaces**: Consistent patterns for models and services across modules

## Core Domain Models

The foundation of the architecture is in the core domain models:

### Base Types

- **Entity**: Base type for all domain entities with a UUID identifier
- **TenantScoped**: Interface for entities owned by a specific tenant
- **Money**: Value object for currency and amount
- **Result<T>**: Generic result type for success/failure handling

```typescript
// Example of Entity and TenantScoped interfaces
export interface Entity {
  id: UUID;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantScoped {
  tenantId: UUID;
}
```

## Service Layer

Services provide the business logic and data access for each module:

### Service Interfaces

- **IService**: Base interface for all services
- **IRepository**: Generic CRUD operations
- **ICache**: Caching interface
- **IEventBus**: Event publishing and subscription
- **ILogger**: Logging interface
- **IFeatureFlag**: Feature flag management
- **ITenantContext**: Current tenant context

### Module-Specific Services

Each module implements its own services:

- **TenantService**: Manages tenant data and settings
- **ConversationService**: Handles messaging functionality
- **ProductService**: Manages product catalog
- **OrderService**: Processes orders and transactions

```typescript
// Example of a service interface
export interface ITenantService extends IService {
  findBySubdomain(subdomain: string): Promise<Result<Tenant>>;
  updateSettings(id: UUID, settings: TenantSettings): Promise<Result<Tenant>>;
  // Additional methods...
}
```

## Dependency Injection

The architecture uses a simple service registry for dependency injection:

### ServiceRegistry

A singleton registry that manages service instances:

```typescript
// Simplified example of the ServiceRegistry
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, any> = new Map();

  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  public register<T>(serviceId: string, service: T): void {
    this.services.set(serviceId, service);
  }

  public get<T>(serviceId: string): T {
    return this.services.get(serviceId) as T;
  }
}
```

### Service Initialization

Services are initialized and registered at application startup:

```typescript
// Example of service initialization
export function initializeServices(): void {
  const registry = ServiceRegistry.getInstance();
  
  // Register core services
  registry.register("tenantService", new TenantServiceImpl());
  registry.register("conversationService", new ConversationServiceImpl());
  registry.register("productService", new ProductServiceImpl());
  registry.register("orderService", new OrderServiceImpl());
}
```

## React Integration

The architecture provides seamless integration with React:

### Service Provider

A React context provider makes services available throughout the component tree:

```tsx
// Example of ServiceProvider
export const ServiceContext = createContext<{
  getService: <T>(serviceId: string) => T;
}>({
  getService: () => {
    throw new Error("ServiceContext not initialized");
  },
});

export const ServiceProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const registry = ServiceRegistry.getInstance();
  
  const getService = useCallback(<T>(serviceId: string): T => {
    return registry.get<T>(serviceId);
  }, []);
  
  return (
    <ServiceContext.Provider value={{ getService }}>
      {children}
    </ServiceContext.Provider>
  );
};
```

### Custom Hooks

Custom hooks provide easy access to services in components:

```tsx
// Example of custom hooks
export const useTenantService = (): ITenantService => {
  const { getService } = useContext(ServiceContext);
  return getService<ITenantService>("tenantService");
};

export const useConversationService = (): IConversationService => {
  const { getService } = useContext(ServiceContext);
  return getService<IConversationService>("conversationService");
};
```

## Performance Optimizations

The architecture includes several optimizations for African markets with limited connectivity:

1. **Offline Caching**: Theme settings and critical data cached in localStorage
2. **Network Status Detection**: Visual indicators for offline status
3. **Retry Mechanisms**: Graceful retries for API calls with fallbacks
4. **Skeleton Loading**: Loading placeholders to improve perceived performance
5. **Error Boundaries**: Graceful failure handling
6. **Non-Blocking Notifications**: Toast notifications instead of blocking alerts

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

### Development Testing

For local development and testing:

```
# Test with a specific tenant
http://localhost:3000?subdomain=tenant1

# Default tenant
http://localhost:3000
```

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

## Contributing

### Adding a New Module

To add a new module to the architecture:

1. Create the module directory structure in `src/modules/`
2. Define domain models in the `models/` directory
3. Implement services in the `services/` directory
4. Create UI components in the `components/` directory
5. Update module index files to export the new types and services
6. Register the module's services in the service initializer

### Code Style Guidelines

- Use TypeScript interfaces for domain models
- Implement services as classes that implement service interfaces
- Use React functional components with hooks for UI components
- Follow established naming conventions (e.g., I-prefixed interfaces, service-suffixed services)
- Document public APIs with JSDoc comments
