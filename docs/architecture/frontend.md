# Frontend Architecture

## Frontend Overview

The ConversationalCommerce frontend follows a modular architecture using React, Next.js, TypeScript, and Chakra UI. The architecture prioritizes:

1. **Mobile-First Design**: All UI components are designed for mobile first
2. **Chat-Native Experience**: UI elements that feel natural in messaging contexts
3. **Strict TypeScript**: Full type safety with strict mode enabled
4. **Modular Organization**: Clear module boundaries with explicit dependencies
5. **React Query**: Efficient data fetching, caching, and synchronization

## Module Structure

```
┌──────────────────────────────────────────────────────────────────┐
│                       Frontend Application                       │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │            │  │            │  │            │  │            │  │
│  │    Core    │◄─┤   Tenant   │◄─┤  Product   │◄─┤   Order    │  │
│  │   Module   │  │   Module   │  │   Module   │  │   Module   │  │
│  │            │  │            │  │            │  │            │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│        ▲                ▲               ▲              ▲         │
│        │                │               │              │         │
│        │                │               │              │         │
│  ┌─────┴────────────────┴───────────────┴──────────────┴──────┐  │
│  │                                                           │  │
│  │                     UI Components                         │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                               ▲                                  │
│                               │                                  │
│  ┌───────────────────────────┐│┌───────────────────────────────┐ │
│  │       Service Layer       ││      API Communication         │ │
│  └───────────────────────────┘│└───────────────────────────────┘ │
│                               │                                  │
└───────────────────────────────┼──────────────────────────────────┘
                                │
                                ▼
                           Backend API
```

## Module Dependencies

The frontend follows strict module boundaries with a clear dependency hierarchy:

- **Core**: Base types, utilities, cross-cutting concerns - No dependencies
- **Tenant**: Merchant configuration and management - Can import from Core
- **Conversation**: Messaging system - Can import from Core, Tenant
- **Product**: Product catalog management - Can import from Core, Tenant
- **Order**: Order processing and transactions - Can import from Core, Tenant, Product
- **Storefront**: Storefront configuration - Can import from Core, Tenant, Product, Order
- **Theme**: Theming engine and configuration - Can import from Core, Tenant

## Direct Module Imports

The codebase strictly enforces direct module imports:

```typescript
// ✅ CORRECT: Direct module import
import type { UUID, Entity } from '@/modules/core/models/base';
import { Status } from '@/modules/core/models/base';

// ❌ INCORRECT: Bridge file import (not allowed)
import { UUID, Entity, Status } from '@/types/base';
```

## Component Architecture

UI components follow a hierarchical architecture:

1. **Base UI Components**: Reusable, atomic UI elements
2. **Domain Components**: Feature-specific components tied to business domains
3. **Page Components**: Top-level components for routes
4. **Layout Components**: Structure and navigation components

## State Management

The frontend uses a combination of state management approaches:

1. **React Query**: For server state and API data
2. **React Context**: For shared UI state
3. **Local Component State**: For component-specific state
4. **URL State**: For shareable and bookmarkable state

## React Query Implementation

```typescript
// Service definition
export const getOrders = async (filters: OrderFilters): Promise<Order[]> => {
  const response = await axios.get('/api/v1/orders', { params: filters });
  return response.data;
};

// Component implementation
function OrderList() {
  const { data: orders, isLoading, error } = useQuery(
    ['orders', filters],
    () => getOrders(filters),
    { 
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
  
  // Component rendering logic...
}
```

## Form Handling

Forms use React Hook Form with Zod for validation:

```typescript
const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Please enter a valid phone number'),
});

function ProfileForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '' },
  });
  
  // Form handling logic...
}
```

## Error Handling

Frontend error handling is consistent across the application:

1. **API Error Handling**: Centralized error processing 
2. **Toast Notifications**: User-friendly error messages
3. **Form Validation**: Client-side validation with detailed feedback
4. **Error Boundaries**: Graceful UI recovery from rendering errors

## Mobile-First Design

The UI follows mobile-first design principles:

1. **Responsive Layouts**: Flex-based layouts that adapt to screen size
2. **Touch-Friendly Elements**: Large tap targets and appropriate spacing 
3. **Progressive Enhancement**: Core functionality works on all devices
4. **Chat-Native Patterns**: UI elements that feel natural in chat interfaces

## Phase 2 UI Components

The Phase 2 implementation includes several key UI components:

1. **Buyer Profile Management**: Profile editing, security settings
2. **Address Book**: Address management with CRUD operations
3. **Order Management**: Order history, details, and return workflows
4. **Team Management**: Team member management and invitations
5. **Admin Dashboards**: Seller verification and monitoring

For detailed information on Phase 2 UI components, see [phase2-features.md](phase2-features.md).
