# ConversationalCommerce Platform: Technical Guide

## 🚀 Our Core: Commerce in Conversation

The technical approach of ConversationalCommerce is built around enabling commerce in conversation as the default. All features, APIs, and flows are designed to work seamlessly in chat (WhatsApp, IG, TikTok, etc.) as well as on the web. The webapp is a complement, but the heart of the platform is enabling every commerce action—discovery, cart, upsell, checkout, payment—through natural conversation, just as Africans do commerce every day.

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

## 🤝 Trust & Naturalness in Conversational Commerce

Trust is at the heart of commerce in Africa. Our technical approach is designed so that buyers and sellers always feel like they're talking to real people, not bots. We prioritize:

- **Authentic, Human-Like Chat:** No "bot speak"—conversations use local language, slang, and context-aware replies.
- **Clear Identity:** Always show who is speaking (buyer, seller, or assistant), but keep automation subtle and helpful.
- **Personalization:** Use names, local expressions, and context to make every chat feel personal.
- **Trust Signals:** Verified badges, clear receipts, and confirmations that look and feel like real commerce.
- **Privacy & Security:** Respect for phone numbers and personal info, with clear opt-in/out for notifications.
- **Seamless Human Escalation:** If a conversation gets stuck, it's easy to talk to a real person—no dead ends.

Our conversational engine is trained on real African chat data, supports local dialects, and is always improving to make commerce feel as natural and trustworthy as chatting with a friend or local vendor.

This comprehensive technical guide covers the entire ConversationalCommerce platform, including all major components, architecture decisions, and implementation details.

## System Architecture Overview

The ConversationalCommerce platform is built with a modular monolith architecture:

```
ConversationalCommerce Platform
├── Frontend (Next.js)
│   ├── Modules
│   │   ├── Core
│   │   ├── Tenant
│   │   ├── Conversation
│   │   │   └── WhatsApp NLP Integration ✅
│   │   ├── Product
│   │   ├── Order
│   │   ├── Storefront
│   │   ├── Theme
│   │   └── Monitoring
│   ├── Features
│   │   ├── Multi-tenant Storefront
│   │   ├── Seller Dashboard
│   │   ├── Admin Portal
│   │   └── Storefront Editor
├── Backend (FastAPI)
│   ├── User Management
│   ├── Product Catalog
│   ├── Order Processing
│   ├── Storefront Services
│   ├── WhatsApp Webhook ✅
│   └── Analytics Engine
├── Database (PostgreSQL)
│   ├── UUID-based Identifiers
│   └── Multi-tenant Schema
└── Infrastructure
    ├── CI/CD Pipeline
    ├── Containerization
    └── Cloud Deployment
```

## Core Technical Principles

1. **Multi-tenancy**: The platform supports multiple sellers with isolated data
2. **Type Safety**: TypeScript on frontend and Pydantic on backend ensure type safety
3. **API-First Design**: RESTful APIs with OpenAPI specifications
4. **Modular Monolith**: Clear module boundaries with direct module imports
5. **Responsive Design**: Mobile-first approach with responsive UI components
6. **Security**: Role-based access control and data isolation
7. **Performance**: Optimized database queries and asset delivery

## Frontend Architecture

### Technology Stack

- **Framework**: Next.js with React
- **Architecture**: Modular monolith with clear module boundaries
- **State Management**: React Context API, local component state
- **Styling**: Tailwind CSS
- **API Integration**: Axios
- **Authentication**: Clerk Authentication
- **UI Components**: Custom components with Headless UI and Heroicons
- **Module Structure**: Core, Tenant, Conversation, Product, Order, Storefront, Theme, Monitoring
- **Type Safety**: TypeScript with strict mode and ESLint rules for architectural compliance

### Next.js App Router: 'use client' Directive

If you use React hooks (like `useState`, `useEffect`, `useParams`, etc.) in a file under `src/app/`, you **must** add the following as the very first line of the file:

```tsx
'use client';
```

- This tells Next.js that the file is a Client Component and can use browser-only APIs and React hooks.
- If you forget this, your build will fail with errors about hooks only being allowed in client components.
- **Best Practice:** Always add `'use client';` to the top of any file in `src/app/` that uses React hooks or browser APIs.
- Applies to both `.tsx` and `.jsx` files.
- See: [Next.js docs on Client Components](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#client-components)

### Key Features and Components

#### Multi-tenant Storefront

The storefront supports multiple tenants through a comprehensive tenant resolution system:

- **Subdomain Resolution**: Each seller gets a unique subdomain
- **Custom Domain Support**: Sellers can use their own domains
- **Tenant Context**: React context provides tenant information throughout the app
- **Tenant-specific Themes**: Each tenant can have custom theming

#### Seller Dashboard

- **Sales Analytics**: Real-time and historical sales data
- **Inventory Management**: Stock tracking and notifications
- **Order Management**: Processing, fulfillment, and tracking
- **Customer Management**: Customer profiles and communication
- **Settings**: Account, billing, and store configuration

#### Storefront Editor

The Storefront Editor allows sellers to customize their storefronts:

- **Asset Management**: Upload and manage media assets
- **Draft Management**: Create and test changes before publishing
- **Version History**: Track and restore previous versions
- **Permissions**: Manage user roles and access control
- **Banner & Logo Management**: Create and manage visual elements
- **Layout Editor**: Customize page layouts with drag-and-drop
- **Theme Customization**: Color schemes, typography, and styling

#### Mobile Optimization

The platform includes several components and utilities specifically designed for mobile optimization, particularly targeting low-end Android devices and unstable network conditions:

- **MobileOptimizationService**: A singleton service that provides:
  - Device detection (mobile/tablet/desktop)
  - Performance class detection (low/medium/high-end devices)
  - Network status and connection quality monitoring
  - Optimization recommendations (touch targets, image quality, pagination)
  - Utilities to adapt UI complexity based on device capabilities

- **OfflineDataHandler**: A component that enables robust offline support:
  - Transparent caching of data with expiration policies
  - Offline indication in the UI
  - Automatic retry and synchronization when connectivity is restored
  - Support for critical flows during network instability

- **TouchTargetArea**: A component ensuring accessibility compliance:
  - Enforces minimum 44x44px touch targets per WCAG guidelines
  - Dynamically adjusts hitboxes for different device types
  - Provides visual feedback for touch interactions

- **PerformanceMonitoring**: A utility for tracking performance metrics:
  - Core Web Vitals tracking (LCP, FID, CLS)
  - Custom component render time tracking
  - Network request performance monitoring
  - Performance rating system for metrics

- **PerformanceAuditOverlay**: A development tool for real-time performance visualization:
  - Displays Core Web Vitals and custom metrics
  - Shows device information and network status
  - Real-time metric recording and visualization
  - Only enabled in non-production environments

#### Module Structure

The frontend follows a modular monolith architecture with clear module boundaries:

- **Core Module**: Base types (Entity, UUID, etc.), utilities, and cross-cutting concerns
- **Tenant Module**: Merchant configuration and management
- **Conversation Module**: Messaging system for customer engagement
  - **WhatsApp Integration**: ✅ VERIFIED - Multi-tenant WhatsApp NLP cart management
  - **Intent Classification**: Natural language processing for chat commands
  - **Event Logging**: Structured logging of all conversation events
- **Product Module**: Product catalog management
- **Order Module**: Order processing and transactions
- **Storefront Module**: Storefront configuration and customization
- **Theme Module**: Theming engine and configuration
- **Monitoring Module**: System monitoring and alerts

Each module contains its own:

- **Models**: Domain models and types
- **Services**: Business logic and data access
- **Components**: UI components specific to the module
- **Utils**: Helper functions for the module

#### Import Guidelines

The codebase follows strict import guidelines to maintain architectural integrity:

- Direct module imports instead of bridge files
- Type-only imports for interfaces and types
- Clear module boundaries enforced by ESLint
- Consistent import organization

Example:

```typescript
// Correct pattern
import type { UUID } from '@/modules/core/models/base';
import { ProductService } from '@/modules/product/services/ProductService';
```

# Conversation Event Logging, Analytics, and Clerk Integration

## Event Logging

- All significant conversation actions (messages, joins, leaves, closes, etc.) are logged as structured events.
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

## Best Practices

- Always use the ConversationEventLogger for logging events in the frontend.
- Ensure user and tenant IDs are sourced from Clerk context/hooks.
- Extend analytics and monitoring by adding new event types and updating the dashboard as needed.

# WhatsApp NLP Cart Management ✅ VERIFIED

## System Overview

The WhatsApp NLP Cart Management system enables customers to interact with their shopping carts directly through the seller's WhatsApp number. The system has been successfully verified against all requirements:

- **Seller-Specific WhatsApp Numbers**: Each seller uses their own WhatsApp number ✅
- **No Web Chat Interface**: Implementation operates entirely through WhatsApp without requiring a web chat UI ✅
- **NLP Cart Management**: Successfully processes natural language cart commands ✅
- **Multi-Tenant Message Routing**: Correctly routes messages to the appropriate seller ✅
- **Integration with Existing NLP Pipeline**: Leverages the existing backend NLP cart management ✅

## Technical Implementation

### Webhook Architecture

```
WhatsApp NLP Cart Management
├── Frontend
│   └── Seller Settings (WhatsApp Number Configuration)
├── Backend
│   ├── API Endpoints
│   │   └── /api/v1/whatsapp/webhook
│   ├── Services
│   │   ├── WhatsAppMessageManager
│   │   └── NLP Processing Pipeline
│   └── Models
│       └── Tenant (with WhatsApp Number)
└── External Services
    ├── WhatsApp Business API
    └── Twilio (Fallback)
```

### Key Components

1. **WhatsApp Webhook Endpoint**:

   - Path: `/api/v1/whatsapp/webhook`
   - Handles both verification requests and incoming messages
   - Verifies webhook signatures for security
   - Located in `/backend/app/api/v1/endpoints/whatsapp.py`

2. **Message Processing Flow**:

   - Receives incoming WhatsApp messages
   - Identifies tenant by the receiving WhatsApp number
   - Converts WhatsApp messages to conversation events
   - Processes through existing NLP pipeline
   - Sends responses back to customer via seller's WhatsApp number

3. **WhatsAppMessageManager**:

   - Manages sending messages on behalf of multiple tenants
   - Handles credential caching for performance
   - Supports fallback to platform-wide Twilio credentials
   - Uses background tasks for async message sending

4. **Multi-Tenant Support**:

   - Each seller registers their WhatsApp number through settings
   - Tenant identification through WhatsApp number receiving the message
   - Isolated message processing per tenant
   - Tenant-specific product catalog for NLP processing

5. **NLP Integration**:
   - Reuses existing NLP pipeline for intent classification
   - Handles intents: add_to_cart, remove_from_cart, update_cart, view_cart, clear_cart
   - Extracts product names and quantities from natural language messages
   - Generates appropriate responses based on cart actions

## Environment Configuration

```
# WhatsApp webhook verification
WHATSAPP_API_VERSION=v16.0
WHATSAPP_APP_SECRET=your_app_secret_from_meta
WHATSAPP_VERIFY_TOKEN=create_a_random_string_for_webhook_verification

# Twilio credentials (for platform-managed integration)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=your_platform_whatsapp_number (optional fallback)
```

## Integration Methods

Two approaches are supported for WhatsApp integration:

1. **Platform-Managed Twilio Integration (Default)**:

   - Sellers simply register their WhatsApp number in settings
   - Platform manages all message routing through Twilio
   - Simplest approach for sellers with minimal technical requirements

2. **Direct WhatsApp Business API Integration (Advanced)**:
   - For sellers with their own WhatsApp Business API credentials
   - Requires additional configuration in the tenant settings
   - Provides more control and potentially lower costs at scale

## Security Considerations

- All webhook requests are verified using signature validation
- Tenant isolation ensures messages are processed by the correct seller
- WhatsApp numbers are protected by tenant permissions
- Background tasks prevent webhook timeouts during processing

## Monitoring and Analytics

- All WhatsApp interactions are logged as conversation events
- NLP intent recognition success rate is tracked
- Cart conversion analytics show effectiveness of WhatsApp cart management
- Failed message deliveries are logged for troubleshooting

## Future Enhancements

- Rich media support for product images in cart responses
- Interactive buttons for cart management (using WhatsApp Interactive Messages)
- Advanced analytics dashboard for WhatsApp cart conversion metrics
- A/B testing for NLP response templates

## Backend Architecture

### Technology Stack

- **Framework**: FastAPI
- **ORM**: SQLAlchemy with asyncio support
- **Database Migrations**: Alembic
- **Authentication**: JWT-based authentication
- **Validation**: Pydantic models
- **Documentation**: OpenAPI/Swagger

### Key Services and APIs

#### User Management

- **Authentication**: User registration, login, and session management
- **Authorization**: Role-based access control with fine-grained permissions
- **Profile Management**: User profiles with preferences and settings
- **Multi-tenant User Model**: Users can belong to multiple tenants with different roles

#### Product Catalog

- **Product Management**: CRUD operations for products
- **Category Management**: Hierarchical product categories
- **Variant Management**: Product variations with attributes
- **Pricing Management**: Regular and sale pricing with scheduling
- **Inventory Management**: Stock tracking and availability

#### Order Processing

- **Order Creation**: Cart to order conversion
- **Payment Processing**: Integration with payment gateways
- **Order Fulfillment**: Tracking, shipping, and delivery
- **Returns and Refunds**: Processing returns and issuing refunds
- **Notifications**: Order status updates via email and SMS

#### Storefront Services

- **Storefront Configuration**: Theme, layout, and content configuration
- **Asset Management**: Upload, optimization, and delivery of media assets
- **Banner Management**: Display and targeting of promotional banners
- **Logo Management**: Brand identity management
- **SEO Management**: Meta tags, sitemaps, and structured data

#### Analytics Engine

- **Sales Analytics**: Revenue, growth, and trends
- **Customer Analytics**: Acquisition, retention, and behavior
- **Inventory Analytics**: Stock levels, turnover, and forecasting
- **Marketing Analytics**: Campaign performance and ROI
- **Performance Monitoring**: System health and performance metrics

## Database Architecture

### PostgreSQL with UUID Identifiers

The platform has standardized on PostgreSQL's native UUID data type for all database primary and foreign keys, providing:

- **Global Uniqueness**: Ensures IDs are unique across the system
- **Security**: Non-sequential IDs prevent enumeration attacks
- **Distribution**: Supports distributed systems without ID collisions
- **Migration Friendly**: Simplifies database migrations and sharding
- **Consistency**: All models follow the same UUID pattern

Implementation:

```python
# Backend model example with standardized UUID
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    # Other fields...

# Example of relationship with UUID foreign key
class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    # One-to-one relationship with cascade delete
    storefront_config = relationship("StorefrontConfig", back_populates="tenant", uselist=False, cascade="all, delete-orphan")
```

#### UUID Migration Strategy

A complex migration process was implemented to transition from String-based UUID representations to native PostgreSQL UUID data types:

1. **Data Preservation**: Temporary columns created to store original values
2. **Type Conversion**: String UUIDs converted to native UUID format
3. **Foreign Key Updates**: All references updated to maintain relational integrity
4. **Validation**: Data verification to ensure successful migration

This standardization improves database performance, ensures type consistency, and enables more reliable relationships between entities.

### Multi-tenant Schema

The database follows a multi-tenant architecture:

- **Tenant Isolation**: Each tenant's data is isolated
- **Shared Infrastructure**: All tenants share the same database instance
- **Tenant References**: Foreign key relationships maintain tenant boundaries
- **Performance Optimization**: Indexes on tenant_id for efficient queries

## API Design

### RESTful API Patterns

- **Resource-based URLs**: `/api/v1/tenants/{tenant_id}/products`
- **HTTP Methods**: GET, POST, PUT, PATCH, DELETE for CRUD operations
- **Status Codes**: Proper use of HTTP status codes
- **Pagination**: Offset-based pagination with limit and skip parameters
- **Filtering**: Query parameters for filtering resources
- **Sorting**: Query parameters for sorting resources
- **Error Handling**: Consistent error response format

### Authentication and Authorization

#### Authentication Architecture

- **Clerk Integration**: Secure authentication service with support for various authentication methods
- **Centralized Auth Utilities**: Custom `auth-utils.tsx` providing consistent authentication throughout the application
- **Next.js App Router Compatible**: Authentication system designed to work with Next.js 15 App Router architecture
- **UUID Compatibility**: Authentication system designed to work with the database UUID standardization

```typescript
// auth-utils.tsx - Centralized authentication utilities
import { useAuth as useClerkAuth, useUser } from '@clerk/nextjs';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded: isAuthLoaded, userId } = useClerkAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  // Proper handling of loading states and authentication
  // Implementation details that support UUID standardization
}

// Custom hook for consistent auth access
export function useAuth() {
  return useContext(AuthContext);
}
```

#### Authorization System

- **Role-based Authorization**: Access control based on user roles
- **Tenant-Scoped Permissions**: Permissions limited to specific tenant contexts
- **Feature-based Access Control**: Granular control over feature access
- **Scope-based Permissions**: Fine-grained permissions for specific actions
- **Tenant Isolation**: Users can only access their own tenant's data

## Frontend Component Implementation

### Storefront Editor Components

#### Asset Management

The Asset Management component allows uploading and managing media assets:

- **Upload**: Drag-and-drop and file selection with type validation
- **Listing**: Grid and list views with filtering and pagination
- **Detail View**: Asset information and usage tracking
- **Optimization**: Automatic image optimization for web delivery

#### Draft Management

The Draft Management component handles configuration drafts:

- **Creation**: Create new drafts from current or previous versions
- **Editing**: Modify draft configurations with real-time validation
- **Publishing**: Publish drafts to make them live
- **Scheduling**: Schedule drafts to be published at a future date

#### Version History

The Version History component tracks configuration changes:

- **Timeline**: Chronological view of all configuration versions
- **Comparison**: Side-by-side comparison of different versions
- **Restoration**: Restore previous versions as new drafts
- **Audit Trail**: Track who made changes and when

#### Permissions Management

The Permissions component manages user access:

- **Role Assignment**: Assign roles to users (Viewer, Editor, Publisher, Admin)
- **Section Permissions**: Grant access to specific sections
- **Component Permissions**: Fine-grained access to individual components
- **Audit Logging**: Track permission changes for security compliance

#### Banner & Logo Management

##### Banner Management Features

- **Creation**: Create banners with images, links, and targeting
- **Editing**: Modify existing banners with real-time preview
- **Publishing**: Control banner visibility and scheduling
- **Targeting**: Show banners to specific audience segments
- **Ordering**: Arrange banners in display order with drag-and-drop
- **Analytics**: Track banner performance metrics

##### Logo Management Features

- **Type-based Management**: Manage different logo types
- **Scheduling**: Set active periods for seasonal logos
- **Responsive Settings**: Configure logo display for different screen sizes
- **Preview**: See how logos will appear in different contexts
- **Version Control**: Track logo changes over time

## Backend Service Implementation

### Storefront Configuration Services

#### Draft Service

Handles the creation and management of configuration drafts:

```python
# Simplified draft service example
async def create_draft(tenant_id: UUID, data: DraftCreate) -> Draft:
    """Create a new draft for a tenant."""
    draft = Draft(
        tenant_id=tenant_id,
        name=data.name,
        description=data.description,
        changes=data.changes,
        status=DraftStatus.DRAFT,
        created_by=data.user_id,
        updated_by=data.user_id
    )
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft
```

#### Version History Service

Manages versioning of storefront configurations:

```python
# Simplified version service example
async def create_version(tenant_id: UUID, config_id: UUID, data: VersionCreate) -> Version:
    """Create a new version snapshot."""
    version = Version(
        storefront_config_id=config_id,
        version_number=await get_next_version_number(config_id),
        change_summary=data.change_summary,
        change_description=data.change_description,
        tags=data.tags,
        configuration_snapshot=data.configuration,
        created_by=data.user_id
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)
    return version
```

#### Permission Service

Manages access control for storefront editing:

```python
# Simplified permission service example
async def assign_role(tenant_id: UUID, user_id: UUID, role: StorefrontRole) -> Permission:
    """Assign a role to a user for a specific tenant."""
    permission = await get_permission(tenant_id, user_id)
    if permission:
        permission.role = role
    else:
        permission = Permission(
            tenant_id=tenant_id,
            user_id=user_id,
            role=role
        )
        db.add(permission)

    await db.commit()
    await db.refresh(permission)
    return permission
```

#### Asset Service

Handles media asset management:

```python
# Simplified asset service example
async def upload_asset(
    tenant_id: UUID,
    file: UploadFile,
    metadata: AssetMetadata
) -> Asset:
    """Upload and process a new asset."""
    # Validate file type and size
    validate_file(file)

    # Generate file path and save file
    filename = generate_unique_filename(file.filename)
    file_path = f"assets/{tenant_id}/{filename}"
    await save_file(file, file_path)

    # Create asset record
    asset = Asset(
        tenant_id=tenant_id,
        filename=filename,
        original_filename=file.filename,
        file_path=file_path,
        file_size=file.size,
        mime_type=file.content_type,
        asset_type=determine_asset_type(file.content_type),
        title=metadata.title,
        description=metadata.description,
        alt_text=metadata.alt_text,
        metadata=metadata.additional_metadata
    )

    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    # Queue optimization if it's an image
    if asset.asset_type == AssetType.IMAGE:
        await queue_image_optimization(asset.id)

    return asset
```

#### Banner Service

Manages promotional banners:

```python
# Simplified banner service example
async def create_banner(tenant_id: UUID, data: BannerCreate) -> Banner:
    """Create a new banner."""
    # Validate asset exists and belongs to the tenant
    await validate_asset_ownership(tenant_id, data.asset_id)

    # Determine display order
    max_order = await get_max_banner_order(tenant_id)

    banner = Banner(
        tenant_id=tenant_id,
        title=data.title,
        banner_type=data.banner_type,
        asset_id=data.asset_id,
        link_url=data.link_url,
        content=data.content,
        start_date=data.start_date,
        end_date=data.end_date,
        display_order=max_order + 1,
        target_audience=data.target_audience,
        custom_target=data.custom_target,
        custom_styles=data.custom_styles,
        status=BannerStatus.DRAFT,
        created_by=data.user_id
    )

    db.add(banner)
    await db.commit()
    await db.refresh(banner)
    return banner
```

#### Logo Service

Manages brand logos:

```python
# Simplified logo service example
async def create_logo(tenant_id: UUID, data: LogoCreate) -> Logo:
    """Create a new logo."""
    # Validate asset exists and belongs to the tenant
    await validate_asset_ownership(tenant_id, data.asset_id)

    logo = Logo(
        tenant_id=tenant_id,
        name=data.name,
        logo_type=data.logo_type,
        asset_id=data.asset_id,
        display_settings=data.display_settings or {},
        responsive_settings=data.responsive_settings or {},
        start_date=data.start_date,
        end_date=data.end_date,
        status=LogoStatus.DRAFT,
        created_by=data.user_id
    )

    db.add(logo)
    await db.commit()
    await db.refresh(logo)
    return logo
```

## Deployment and Infrastructure

### CI/CD Pipeline

- **Build Process**: Automated builds for frontend and backend
  - **UUID Compatibility**: Build process validates UUID format consistency
  - **Authentication Checks**: Verifies Clerk integration and middleware configuration
  - **App Router Compatibility**: Ensures proper client/server component separation
- **Testing**: Automated unit and integration tests
  - **Database Schema Tests**: Validates UUID field type consistency
  - **Authentication Flow Tests**: Confirms proper authentication behavior
  - **Tenant Isolation Tests**: Ensures data isolation between tenants
- **Linting**: Code quality checks with ESLint and Black
- **Type Checking**: TypeScript strict mode enforcement during build
- **Deployment**: Automated deployment to staging and production
  - **Database Migration Handling**: Special handling for UUID migration
  - **Staged Rollout**: Progressive deployment to minimize impact

#### Build and Deployment Considerations

The following considerations are critical during the build and deployment process:

1. **Database Migration Sequence**:

   - Execute UUID migration scripts before application deployment
   - Verify data integrity after migration completion
   - Maintain backward compatibility during transition period

2. **Authentication System Updates**:

   - Update Clerk environment variables before deployment
   - Ensure middleware compatibility with Next.js App Router
   - Test authentication flows thoroughly post-deployment

3. **Client/Server Component Separation**:
   - Next.js build will fail if client components incorrectly import server components
   - Authentication components must be properly marked as client components
   - Dynamic route parameters must be properly typed and handled

### Containerization

- **Docker**: Containerized services for consistent environments
- **Docker Compose**: Local development environment
- **Kubernetes**: Container orchestration for production

### Cloud Deployment

- **Cloud Provider**: AWS/GCP/Azure
- **Database**: Managed PostgreSQL service
- **Storage**: Object storage for media assets
- **CDN**: Content delivery network for static assets
- **Monitoring**: Application and infrastructure monitoring

## Testing Strategy

### Frontend Testing

- **Unit Tests**: Jest for testing individual components
- **Integration Tests**: React Testing Library for component interaction
- **E2E Tests**: Cypress for end-to-end testing
- **Visual Tests**: Storybook for component visual testing

### Backend Testing

- **Unit Tests**: Pytest for testing individual functions
- **Integration Tests**: Test API endpoints with test client
- **Database Tests**: Test database interactions with test database
- **Mocking**: Mock external services for isolated testing

## Security Considerations

### Authentication

- **User Authentication**: Secure login with Clerk Authentication
- **API Authentication**: JWT tokens with proper expiration
- **Password Policies**: Strong password requirements

### Authorization

- **Role-based Access**: Different roles for different access levels
- **Permission Checking**: Middleware to check permissions
- **Tenant Isolation**: Users can only access their own tenant's data

### Data Protection

- **Input Validation**: Validate all user input
- **SQL Injection Protection**: Parameterized queries with SQLAlchemy
- **XSS Protection**: React's automatic escaping and CSP
- **CSRF Protection**: CSRF tokens for form submissions
- **Data Encryption**: Sensitive data encrypted at rest and in transit

## Performance Optimization

### Frontend Performance

- **Code Splitting**: Load only necessary code
- **Image Optimization**: Next.js image optimization
- **Caching**: Client-side caching with SWR
- **Bundle Size**: Monitor and optimize bundle size
- **Lazy Loading**: Load components only when needed

### Backend Performance

- **Database Indexing**: Proper indexes for common queries
- **Query Optimization**: Efficient database queries
- **Connection Pooling**: Reuse database connections
- **Caching**: Cache frequently accessed data
- **Pagination**: Limit data returned from APIs

### API Performance

- **Rate Limiting**: Prevent abuse with rate limiting
- **Compression**: Compress API responses
- **Efficient Serialization**: Fast JSON serialization
- **Batching**: Support for batch operations
- **GraphQL Consideration**: Consider GraphQL for complex data requirements

## Monitoring and Logging

- **Application Logging**: Structured logging for application events
- **Error Tracking**: Capture and report errors
- **Performance Monitoring**: Track API and database performance
- **User Analytics**: Monitor user behavior and usage patterns
- **Infrastructure Monitoring**: Track system resources and availability

## Future Roadmap

### Short-term Enhancements

1. **Enhanced Analytics**: More detailed reporting and insights
2. **Advanced Search**: Improved search capabilities with filters
3. **Mobile App**: Native mobile applications for iOS and Android
4. **Performance Optimization**: Further performance improvements
5. **Internationalization**: Support for multiple languages

### Long-term Vision

1. **AI-driven Recommendations**: Personalized product recommendations
2. **Advanced A/B Testing**: Sophisticated testing capabilities
3. **Expanded Integration Ecosystem**: More third-party integrations
4. **Voice Commerce**: Voice-activated shopping experiences
5. **Augmented Reality**: AR product visualization

## Troubleshooting

### Common Issues and Solutions

1. **Missing Dependencies**: Ensure all required packages are installed
2. **API Connection Issues**: Check network configuration and API base URL
3. **Database Connection Issues**: Verify database credentials and connection string
4. **Type Errors**: Ensure proper typing in TypeScript and Python
5. **Authentication Problems**: Check token expiration and refresh processes

### Debugging Tools

1. **Frontend DevTools**: React Developer Tools extension
2. **Network Monitoring**: Browser Network tab for API requests
3. **Backend Debugging**: Pycharm/VSCode debugger
4. **API Documentation**: Swagger UI for API exploration
5. **Database Tools**: PgAdmin for PostgreSQL management

## Contributing Guidelines

1. **Code Style**: Follow established code style guidelines
2. **Pull Requests**: Create PRs with clear descriptions
3. **Testing**: Include tests for new features
4. **Documentation**: Update documentation for changes
5. **Review Process**: Code review by at least one team member

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

## 2024 Product Upload & Sharing UX Update

- **Quick Upload:** Mobile-first, floating button for instant product upload (photo/video, title, price) on dashboard/products page.
- **Emoji-based Empty State:** 📦 emoji is used for empty product lists (no more broken images).
- **Share Modal:** After upload, sellers can share products via WhatsApp, Instagram, TikTok, or Copy Link using a modal with emoji icons (no external icon dependencies).
- **No pop-up tips or legacy image placeholders remain.**
