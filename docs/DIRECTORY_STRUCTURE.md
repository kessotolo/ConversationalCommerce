# ConversationalCommerce Directory Structure

This document provides an overview of the ConversationalCommerce codebase organization, explaining the key directories and their purposes.

## Backend Structure

The backend follows a modular monolith architecture with clean separation of concerns:

```
/backend/app/
├── api/                    # API definition and routes
│   ├── deps/               # Dependency injection helpers
│   ├── routers/            # Legacy routers
│   ├── v1/                 # API v1 endpoints
│   └── v2/                 # API v2 endpoints (newer, more consistent)
├── conversation/           # Conversation and NLP processing
│   ├── handlers/           # Message and event handlers
│   └── nlp/                # Natural language processing
├── core/                   # Core functionality and cross-cutting concerns
│   ├── behavior/           # User behavior tracking
│   ├── cache/              # Caching mechanisms
│   ├── cloudinary/         # Asset storage integration
│   ├── config/             # Application configuration
│   ├── content/            # Content management
│   ├── enforcement/        # Policy enforcement
│   ├── errors/             # Error handling
│   ├── http/               # HTTP helpers
│   ├── middleware/         # Request/response middleware
│   ├── monitoring/         # System monitoring
│   ├── notifications/      # Multi-channel notification system
│   ├── security/           # Security utilities
│   ├── tests/              # Core tests
│   └── websocket/          # WebSocket support
├── db/                     # Database configuration
│   ├── engines/            # Database engines
│   ├── migrations/         # Alembic migrations
│   └── models/             # Legacy models
├── domain/                 # Domain logic
│   ├── events/             # Domain events
│   └── models/             # Domain models
├── middleware/             # Application middleware
├── models/                 # Database models (SQLAlchemy)
│   └── core/               # Core model definitions
├── repositories/           # Data access layer
├── routers/                # Legacy routers
├── schemas/                # Pydantic schemas for request/response
│   └── payment/            # Payment-specific schemas
├── services/               # Business logic services
│   ├── banner/             # Banner management 
│   ├── payment/            # Payment processing
│   ├── shipping/           # Shipping methods
│   ├── storefront/         # Storefront management
│   └── tests/              # Service tests
├── templates/              # Jinja2 templates
│   └── errors/             # Error page templates
├── tests/                  # Integration tests
│   └── services/           # Service tests
└── utils/                  # Utility functions
```

### Key Backend Components

- **API Endpoints**: Located in `/api/v1/endpoints` and `/api/v2/endpoints`, these provide the HTTP interface.
- **Models**: Database models in `/models` define the database schema and relationships.
- **Schemas**: Pydantic schemas in `/schemas` handle validation and serialization of API data.
- **Services**: Business logic in `/services` implements core application functionality.
- **Core**: Shared infrastructure in `/core` provides cross-cutting concerns.

## Frontend Structure

The frontend is organized into modules and components:

```
/frontend/src/
├── app/                    # Next.js app router pages
│   ├── dashboard/          # Seller dashboard routes
│   ├── orders/             # Order management routes
│   ├── sign-in/            # Authentication routes
│   ├── sign-up/            # Registration routes
│   ├── store/              # Store display routes
│   └── store-setup/        # Store onboarding routes
├── components/             # React components
│   ├── StorefrontEditor/   # Storefront editing UI
│   ├── admin/              # Admin dashboards
│   ├── analytics/          # Analytics visualizations
│   ├── auth/               # Authentication components
│   ├── buyer/              # Buyer-specific components
│   ├── common/             # Shared components
│   ├── dashboard/          # Dashboard components
│   ├── layout/             # Layout components
│   ├── monitoring/         # System monitoring UI
│   ├── onboarding/         # Onboarding flows
│   ├── products/           # Product management
│   ├── store/              # Store display components
│   ├── storefront/         # Storefront components
│   ├── team/               # Team management components
│   └── ui/                 # Base UI components
├── contexts/               # React contexts
├── hooks/                  # Custom React hooks
├── lib/                    # Utility libraries
│   ├── api/                # API utilities
│   └── auth/               # Auth utilities
├── modules/                # Business domain modules
│   ├── cart/               # Cart functionality
│   ├── conversation/       # Conversation features
│   ├── core/               # Core utilities
│   ├── dashboard/          # Dashboard logic
│   ├── monitoring/         # Monitoring logic
│   ├── order/              # Order processing
│   ├── payment/            # Payment processing
│   ├── product/            # Product management
│   ├── security/           # Security features
│   ├── shared/             # Shared utilities
│   ├── storefront/         # Storefront management
│   ├── tenant/             # Tenant management
│   └── theme/              # Theming system
├── pages/                  # Next.js pages (legacy)
│   ├── account/            # User account pages
│   └── api/                # API routes
├── services/               # Service layer for API communication
├── types/                  # TypeScript type definitions
└── utils/                  # Utility functions
    └── auth/               # Authentication utilities
```

### Key Frontend Components

- **Modules**: Domain-specific code in `/modules` with clear boundaries between domains
- **Components**: UI components in `/components` organized by feature area
- **Services**: API communication layer in `/services` to interact with backend
- **App Router**: Next.js app directory with modern, route-based organization

## Phase 2 Feature Components

### Buyer Components
- **BuyerProfile**: `/frontend/src/components/buyer/BuyerProfile.tsx` - Container for all profile-related features
- **ProfileEditForm**: `/frontend/src/components/buyer/ProfileEditForm.tsx` - Profile editing interface
- **AddressList**: `/frontend/src/components/buyer/AddressList.tsx` - Address book management
- **AddressForm**: `/frontend/src/components/buyer/AddressForm.tsx` - Address creation/editing
- **NotificationPreferencesForm**: `/frontend/src/components/buyer/NotificationPreferencesForm.tsx` - Notification settings

### Order Management Components
- **OrderList**: `/frontend/src/components/buyer/OrderList.tsx` - Order history display
- **OrderDetail**: `/frontend/src/components/buyer/OrderDetail.tsx` - Detailed order view
- **OrderReturn**: `/frontend/src/components/buyer/OrderReturn.tsx` - Return workflow

### Team Management Components
- **TeamManagement**: `/frontend/src/components/team/TeamManagement.tsx` - Team management container
- **TeamMemberList**: `/frontend/src/components/team/TeamMemberList.tsx` - Team member listing
- **TeamInviteList**: `/frontend/src/components/team/TeamInviteList.tsx` - Invitation management
- **TeamInviteForm**: `/frontend/src/components/team/TeamInviteForm.tsx` - New invitation form

### Seller Verification Components
- **SellerOnboardingAdminDashboard**: `/frontend/src/components/admin/SellerOnboardingAdminDashboard.tsx` - Admin dashboard
- **SellerVerificationStats**: `/frontend/src/components/admin/SellerVerificationStats.tsx` - Verification metrics
- **SellerVerificationList**: `/frontend/src/components/admin/SellerVerificationList.tsx` - Verification queue
- **SellerVerificationDetail**: `/frontend/src/components/admin/SellerVerificationDetail.tsx` - Detailed verification view

### Frontend Services
- **userService.ts**: `/frontend/src/services/userService.ts` - Profile management
- **addressService.ts**: `/frontend/src/services/addressService.ts` - Address book operations
- **orderService.ts**: `/frontend/src/services/orderService.ts` - Order management
- **paymentService.ts**: `/frontend/src/services/paymentService.ts` - Payment method management
- **teamService.ts**: `/frontend/src/services/teamService.ts` - Team management
- **notificationService.ts**: `/frontend/src/services/notificationService.ts` - Notifications
