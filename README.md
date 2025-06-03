# Conversational Commerce Platform

## 🚀 Our Core: Commerce in Conversation

ConversationalCommerce is built from the ground up to enable true commerce in conversation—reflecting how Africans (and similar markets) actually buy and sell. Every step of the journey—product discovery, adding to cart, upselling, checkout, and even payment—can happen naturally in chat, just like real commerce in WhatsApp, Instagram, or TikTok DMs. The webapp is always available for those who want it, but the heart of the experience is the conversation. All APIs, analytics, and features are designed to work seamlessly in chat as well as on the web.

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

A high-growth commerce platform for African markets that seamlessly integrates mobile-first storefronts with WhatsApp messaging capabilities. Built for scale with security and performance in mind.

## 🤝 Trust & Naturalness in Conversational Commerce

Trust is at the heart of commerce in Africa. Our platform is designed so that buyers and sellers always feel like they're talking to real people, not bots. We prioritize:

- **Authentic, Human-Like Chat:** No "bot speak"—conversations use local language, slang, and context-aware replies.
- **Clear Identity:** Always show who is speaking (buyer, seller, or assistant), but keep automation subtle and helpful.
- **Personalization:** Use names, local expressions, and context to make every chat feel personal.
- **Trust Signals:** Verified badges, clear receipts, and confirmations that look and feel like real commerce.
- **Privacy & Security:** Respect for phone numbers and personal info, with clear opt-in/out for notifications.
- **Seamless Human Escalation:** If a conversation gets stuck, it's easy to talk to a real person—no dead ends.

Our conversational engine is trained on real African chat data, supports local dialects, and is always improving to make commerce feel as natural and trustworthy as chatting with a friend or local vendor.

## 📑 Documentation Structure

This project uses a multi-README approach to organize documentation:

- **[Main README](README.md)** (You are here): Project overview, architecture, and key features
- **[Frontend README](frontend/README.md)**: Frontend tech stack, setup, and development guide
- **[Backend README](backend/README.md)**: Backend services, APIs, and database information

## 🌟 Key Features

- **Seller Authentication**: Secure JWT-based authentication through Clerk with role-based access control
- **Product Management**: Full CRUD operations with rich media support and mobile camera integration
- **WhatsApp Integration**: 
  - **WhatsApp Number Management**: Sellers can register their WhatsApp numbers through the platform
  - **WhatsApp Alerting**: Automated notifications sent to sellers' WhatsApp numbers
  - **NLP Cart Management**: Process cart-related commands directly through WhatsApp messages
  - **Multi-Tenant Routing**: Messages route to appropriate seller based on WhatsApp number
- **Multi-Platform Social Sharing**: 
  - Product sharing across WhatsApp, Instagram, TikTok, Facebook, Twitter, and Telegram
  - Branded QR codes for in-person and print marketing
  - UTM tracking for conversion analytics
- **Mobile-First Storefront**: 
  - Optimized interface for African mobile market
  - Bottom navigation for key features
  - Responsive product grid and details
  - Fast loading for low-bandwidth conditions
- **Cart Management**:
  - Web UI cart with full item management
  - Session-based cart persistence
  - Quantity editing and removal
  - WhatsApp-based cart interaction via NLP
- **Advanced Security**: Comprehensive audit logging, request monitoring, optimistic locking, and PostgreSQL Row-Level Security (RLS) for tenant isolation
- **High Performance**: Efficient keyset pagination, database indexing, and batch operations
- **Robust Error Handling**: Standardized error responses and centralized exception management
- **Content Moderation**: AI-powered content filtering with customizable rules and manual review workflows
- **Behavior Analysis**: Pattern detection for suspicious activities with evidence collection and review
- **Violation Management**: Progressive enforcement system with warning to ban escalation
- **Real-Time Monitoring**: WebSocket-based activity monitoring with alerting and notification

## 🛠️ Tech Stack

### Backend

- **FastAPI**: High-performance Python framework
- **PostgreSQL**: Reliable relational database with native UUID support
  - **UUID Standardization**: All models use PostgreSQL UUID(as_uuid=True) for primary and foreign keys
  - **Row-Level Security**: Tenant isolation through PostgreSQL RLS policies
  - **Railway Hosting**: Remote PostgreSQL database hosted on Railway
- **SQLAlchemy**: ORM for database interactions with relationship management
  - **One-to-One Relationships**: Proper cascade behavior between related models
  - **Migrations**: Complex migration scripts for UUID data type transitions
- **Cloudinary**: Media storage and transformation
- **Twilio**: WhatsApp messaging integration

### Frontend

- **Next.js 15**: React framework with App Router architecture
  - **Client/Server Components**: Proper separation following Next.js best practices
  - **Dynamic Routing**: Type-safe parameter handling in dynamic routes
- **TailwindCSS**: Utility-first CSS for rapid UI development
- **TypeScript**: Type-safe JavaScript with strict type checking
- **Clerk**: Authentication and user management
  - **Custom Auth Utilities**: Centralized auth-utils.tsx for consistent authentication
  - **Middleware Integration**: Custom authentication middleware for App Router
  - **UUID Compatibility**: Proper handling of UUID-based user identification
- **Chart.js**: Data visualization for analytics
- **Lucide React**: Icon library for consistent UI

## 📱 Mobile-First Architecture

The platform is designed with a mobile-first approach, recognizing that most users in African markets primarily access the internet via mobile devices:

- **Bottom Tab Navigation**: User-friendly mobile navigation with quick access to key features
- **Mobile Camera Integration**: Direct product photo capture from mobile devices
- **Responsive Dashboard**: Optimized for all screen sizes with special attention to mobile usability
- **Touch-Friendly UI**: Larger touch targets and intuitive gestures for mobile users
- **Offline Capabilities**: Core functionality works with intermittent connectivity
- **WhatsApp-Centric**: Deep integration with the most popular messaging platform in target markets

## 🔄 Recent Updates

### June 2025: WhatsApp NLP Cart Management

- **Multi-Tenant WhatsApp Integration**:
  - Sellers use their own WhatsApp numbers for customer interactions
  - Platform routes messages to correct seller based on receiving WhatsApp number
  - Responses sent from seller's WhatsApp number for brand consistency

- **NLP-Based Cart Management**:
  - Process natural language commands for cart operations directly through WhatsApp
  - Supported commands include: add to cart, remove from cart, update quantity, view cart, clear cart
  - Intent recognition using NLP models to understand customer requests
  - Product name extraction from conversational messages

- **Integration Options**:
  - Platform-managed Twilio integration (default) - sellers just register their number
  - Direct WhatsApp Business API support for advanced sellers
  - Comprehensive webhook system to receive and process WhatsApp messages

- **Analytics & Monitoring**:
  - Conversation tracking in seller dashboard
  - NLP intent recognition success metrics
  - Cart conversion analytics through WhatsApp channel

### May 2025: Database UUID Standardization & Authentication Improvements

- **UUID Standardization**: All database models now use PostgreSQL native UUID types

  - Primary and foreign keys converted from String to UUID(as_uuid=True)
  - Improved database integrity and performance with native UUID types
  - Complex migration process to handle existing String-based UUID values

- **Authentication System Overhaul**:
  - Centralized authentication with custom auth-utils.tsx
  - Fixed Next.js App Router compatibility issues
  - Proper client/server component separation
  - Streamlined tenant-specific authentication flow

### May 2025: Streamlined Seller Onboarding & Theme System

- **Low-Friction Onboarding Flow**:

  - Minimal 4-5 field signup process focused on essential business information
  - Real-time subdomain generation and preview as users type their store name
  - Automatic tenant creation with default theme assignment
  - Pre-filled form data from authentication provider
  - Mobile-optimized design for African market users
  - Intelligent user flow with existing tenant detection

- **Theme Context Provider**:

  - Complete theme system with context providers for accessing theme values throughout the app
  - Default theme fallback for new tenants and error states
  - Theme preview capability with cookie-based storage
  - Responsive design utilities through the `useThemeStyles` hook
  - Component-specific styling derived from theme values

- **Multi-Tenant Architecture**:

  - Enhanced tenant resolution with both subdomain and custom domain support
  - Automatic subdomain generation from business names with conflict resolution
  - Middleware for extracting tenant information from request headers
  - Context providers to make tenant data available throughout the app
  - API routes for tenant lookup by subdomain or custom domain

- **Theme-Aware Components**:
  - ProductCard component refactored to consume theme values
  - Dynamic styling based on tenant branding
  - Interactive hover states and animations using theme colors
  - Consistent typography and spacing using theme values
  - Accessibility improvements with tenant-defined contrast ratios

### May 2025: Multi-Tenant Storefront System

- **Complete Storefront Infrastructure**:

  - Multi-tenant storefront with subdomain support (`tenant.domain.com`) and custom domain verification
  - Tenant isolation with PostgreSQL Row-Level Security (RLS)
  - Redis-based caching layer with performance optimization
  - Comprehensive error handling with custom error pages

- **Domain Verification System**:
  - DNS verification for custom domains with TXT record validation
  - SSL certificate verification and monitoring
  - Automated background verification service
- **Storefront Content API**:

  - Tenant-aware endpoints with proper caching headers
  - Featured products, categories, and navigation menus
  - Product catalog with advanced filtering and pagination
  - Search functionality with NLP-enhanced results

- **Robust NLP Capabilities**:
  - Advanced content analysis using spaCy and NLTK
  - Graceful fallback mechanisms for missing models
  - Dedicated model download script with verification
  - Startup script to ensure models are available

```bash
# Install NLP models automatically
./backend/scripts/download_nlp_models.py

# Verify NLP model installation
./backend/scripts/download_nlp_models.py --verify

# Start application with NLP support
./backend/scripts/start_with_nlp.sh
```

### May 2025: Enhanced Sharing Features

- **WhatsApp Share Link Generator**:

  - Secure share link generation with UTM tracking
  - Tenant verification requirement
  - Share event logging for analytics
  - Campaign, source, and medium tracking
  - Storefront URL integration

  **API Endpoint:**

  ```http
  GET /api/v1/share/whatsapp-link?product_id=PRODUCT_ID&campaign=CAMPAIGN&source=SOURCE&medium=MEDIUM
  ```

  **Query Parameters:**

  - `product_id` (required): The product to share
  - `campaign` (optional): UTM campaign name
  - `source` (optional): UTM source (e.g., whatsapp)
  - `medium` (optional): UTM medium (e.g., share)

  **Example Usage:**

  ```http
  GET /api/v1/share/whatsapp-link?product_id=123&campaign=launch&source=whatsapp&medium=share
  ```

  **Response:**

  ```json
  {
    "whatsapp_link": "https://wa.me/?text=Check%20out%20this%20product%3A%20https%3A%2F%2Fstorefront.com%2Fp%2F123%3Futm_campaign%3Dlaunch%26utm_source%3Dwhatsapp%26utm_medium%3Dshare"
  }
  ```

- **QR Code Generator**:

  - Customizable QR code sizes
  - Tenant verification requirement
  - Event logging for tracking
  - Storefront URL integration
  - Secure link generation

  **API Endpoint:**

  ```http
  GET /api/v1/share/qr-code?product_id=PRODUCT_ID&size=SIZE
  ```

  **Query Parameters:**

  - `product_id` (required): The product to generate a QR code for
  - `size` (optional): Size of the QR code in pixels (default: 256)

  **Example Usage:**

  ```http
  GET /api/v1/share/qr-code?product_id=123&size=300
  ```

  **Response:**

  - Returns a PNG image of the QR code for the product share link

- **Share Service Layer**:
  - Centralized share functionality
  - Tenant isolation
  - Comprehensive error handling
  - Audit logging integration
  - Rate limiting support

### May 2025: Multi-Platform Social Sharing

- **Cross-Platform Social Features**: Added comprehensive sharing capabilities for products

  - WhatsApp sharing with direct messaging and UTM tracking
  - Instagram sharing with caption generation and story instructions
  - TikTok sharing with profile links and content suggestions
  - Facebook sharing with customizable quotes and hashtags
  - Twitter/X sharing with text and hashtag options
  - Telegram messaging integration
  - Branded QR code generation with logo embedding

- **Enhanced UTM Tracking**: Complete campaign, source, and medium tracking across all sharing platforms

- **ShareButtons Component**: Created unified React component to provide consistent sharing experience
  - Support for both compact and full display modes
  - Copy functionality for links and captions
  - Customizable QR code generation
  - Complete error handling
  - Optimized for Vercel deployment with compatible lucide-react icons
  - TypeScript-compatible with proper type checking
  - Responsive design for mobile and desktop views

### May 2025: Next.js and Material UI v7 Compatibility

- **Material UI v7 Integration**: Updated components to use the latest Material UI v7 API

  - Fixed Grid component usage with proper syntax
  - Updated ListItem and related components to follow v7 patterns
  - Improved component styling approaches compatible with MUI v7

- **Next.js Optimization**:

  - Replaced React Router with Next.js routing system
  - Updated environment variable references from React App format to Next.js format
  - Added client-side safety checks for browser-specific operations

- **WebSocket and Real-time Features**:

  - Enhanced WebSocket connections to safely handle client-side rendering
  - Improved toast notification system for real-time alerts
  - Fixed tenant isolation in monitoring components

- **Build Process Improvements**:
  - Streamlined build process with proper TypeScript type checking
  - Replaced axios with native fetch API where needed
  - Added missing dependencies including Twilio for backend notifications

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.10+
- PostgreSQL database
- Clerk account (authentication)
- Cloudinary account (media storage)
- Twilio account (WhatsApp messaging)

### Installation

#### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Edit .env.local with your configuration values
# Required: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY

# Start development server
npm run dev
```

#### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env

# Edit .env with your configuration values
# Required: DATABASE_URL, CLOUDINARY_URL, TWILIO_AUTH_TOKEN

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload
```

### Environment Variables

#### Frontend (.env.local)

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Backend (.env)

```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
JWT_SECRET=your_jwt_secret
```

## 📁 Project Structure

### Frontend Structure

```
frontend/
├── public/                # Static assets
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # Authentication routes
│   │   ├── dashboard/    # Dashboard routes
│   │   │   ├── products/ # Product management
│   │   │   ├── orders/   # Order management
│   │   │   ├── messages/ # WhatsApp messaging
│   │   │   ├── settings/ # Store settings
│   │   │   └── moderation/ # Content review & enforcement
│   │   ├── admin/        # Admin-only routes
│   │   │   └── monitoring/ # Activity monitoring dashboard
│   │   └── storefront/   # Customer-facing storefront
│   ├── components/       # Reusable UI components
│   │   ├── dashboard/    # Dashboard components
│   │   ├── layout/       # Layout components (Sidebar, MobileNav)
│   │   ├── ui/           # Base UI components
│   │   ├── monitoring/   # Activity monitoring components
│   │   │   ├── ActivityDashboard.tsx # Real-time activity display
│   │   │   ├── NotificationCenter.tsx # Alert notifications
│   │   │   └── RulesManager.tsx # Alert rule configuration
│   │   └── moderation/   # Content moderation components
│   │       ├── ContentReview.tsx # Review interface
│   │       ├── ViolationsTable.tsx # Violation management
│   │       └── RulesConfig.tsx # Filter rule configuration
│   ├── hooks/            # Custom React hooks
│   │   └── useWebSocket.ts # WebSocket connection hook
│   ├── lib/              # Utility functions
│   └── types/            # TypeScript types
│       └── monitoring.ts  # Types for monitoring system
├── next.config.js        # Next.js configuration
└── tailwind.config.js    # TailwindCSS configuration
```

### Backend Structure

```
backend/
├── alembic/                 # Database migrations
├── app/
│   ├── api/                 # API endpoints
│   │   ├── v1/              # API version 1
│   │   │   ├── products/    # Product management
│   │   │   ├── orders/      # Order management
│   │   │   ├── messages/    # WhatsApp messaging
│   │   │   ├── users/       # User management
│   │   │   ├── violation.py # Violation management
│   │   │   ├── behavior.py  # Behavior analysis
│   │   │   ├── content_moderation.py # Content filtering
│   │   │   ├── activities.py # Activity history
│   │   │   └── websocket.py # WebSocket endpoints
│   ├── core/                # Core functionality
│   │   ├── auth/            # Authentication
│   │   ├── config/          # Configuration
│   │   ├── db/              # Database
│   │   ├── errors/          # Error handling
│   │   ├── content/         # Content analysis
│   │   ├── behavior/        # Behavior analysis
│   │   ├── enforcement/     # Violation enforcement
│   │   ├── monitoring/      # Activity monitoring
│   │   ├── middleware/      # Request middleware
│   │   ├── notifications/   # Alert notifications
│   │   ├── websocket/       # WebSocket connections
│   │   └── utils/           # Utilities
│   ├── models/              # Database models
│   │   ├── content_filter.py # Content filtering models
│   │   ├── behavior_analysis.py # Behavior detection models
│   │   ├── violation.py     # Violation tracking models
│   │   └── audit_log.py     # Activity logging models
│   ├── schemas/             # Pydantic schemas
│   └── services/            # Business logic
├── tests/                   # Test suite
└── main.py                  # Application entry point
```

## 🔄 Recent Updates

### Comprehensive Protection System Implementation (May 2025)

- **Content Moderation System**:

  - AI-powered content filtering using Detoxify, TextBlob, and spaCy for toxicity, sentiment, and language analysis
  - Customizable filtering rules with field-specific conditions and severity levels
  - Multi-stage review workflow with pending, approved, and rejected states
  - Tenant-isolated moderation policies for each merchant

- **Behavior Analysis System**:

  - Pattern detection engine for identifying suspicious user activities
  - Evidence collection and storage for review and enforcement
  - Confidence scoring system for reducing false positives
  - Review interface for manual verification of detected patterns

- **Violation Management**:

  - Progressive enforcement system (warning → temporary ban → permanent ban)
  - Automatic escalation based on violation history and severity
  - Violation dashboard with filtering by type, severity, and status
  - Statistics and trend analysis for platform-wide insights

- **Real-Time Monitoring**:
  - WebSocket-based activity monitoring with tenant isolation
  - Intelligent alerting based on configurable thresholds
  - In-app, email, and WhatsApp notification delivery
  - Audit logging for security-sensitive operations

### Multi-Tenant Architecture Implementation (May 2025)

- **PostgreSQL Row-Level Security**: Implemented database-level tenant isolation using PostgreSQL RLS
- **Tenant Context Middleware**: Added middleware to extract and validate tenant information from requests
- **Database Session Variables**: Used PostgreSQL session variables to enforce tenant boundaries
- **Secure Service Layer**: Updated services to automatically apply tenant context to all operations
- **Security Testing**: Added integration tests to verify tenant isolation effectiveness
- **Public API Exemptions**: Configured exemptions for public endpoints like health checks and documentation

### Mobile Interface Improvements (May 2025)

- **Bottom Tab Navigation**: Implemented a fixed bottom navigation bar for mobile users with quick access to Home, Products, Orders, Messages, and More options
- **Mobile Camera Integration**: Added direct camera capture for product photos using the device camera
- **Slide-Up Menu**: Added a slide-up menu from the "More" tab for accessing Storefront, Account settings, and Sign Out
- **Simplified Navigation**: Removed top navigation bar for cleaner UI
- **Improved Product Management**: Enhanced product listing with list view and detailed edit pages
- **Next.js Configuration Update**: Updated image configuration from deprecated `domains` to recommended `remotePatterns`

### Key Mobile Experience Enhancements

- **Authentication Flow**: Fixed mobile login redirection for seamless dashboard access
- **Touch-Optimized UI**: Increased padding and spacing for mobile tap targets
- **Consistent Mobile Navigation**: Bottom tabs remain visible across all dashboard sections
- **Responsive Layout**: All pages properly respond to various device sizes

## 💻 Development Workflow

### Admin Monitoring Dashboard

The platform includes a hidden admin monitoring dashboard that provides real-time activity tracking, historical activity browsing, and alert management. This feature is not linked from the main navigation and is intended for administrative use only.

- **Access URL**: `/admin/monitoring`
- **Backend**: Fully implemented with WebSockets for real-time updates
- **Known Issues**: The frontend dashboard has TypeScript errors due to UI component mismatches. These need to be resolved before the dashboard can be used in production.

#### TypeScript Component Issues

There are currently TypeScript errors in the monitoring dashboard related to UI component imports. The main issues are:

1. Case sensitivity mismatches (e.g., `Button.tsx` vs `button.tsx`)
2. Missing UI components that need to be created or adapted
3. Import paths that need to be standardized across the application

These issues don't affect the core functionality of the platform and can be addressed when the admin monitoring features are needed.

### Common Tasks

#### Adding a New Product Feature

1. Create or modify API endpoints in `backend/app/api/v1/products/`
2. Update the corresponding frontend components in `frontend/src/app/dashboard/products/`
3. Use the mobile camera integration for product images when needed
4. Test thoroughly on both desktop and mobile views

#### Implementing WhatsApp Features

1. Configure Twilio webhooks in the backend
2. Update message handling logic in `backend/app/services/messaging/`
3. Enhance the frontend chat interface in `frontend/src/app/dashboard/messages/`

### Best Practices

- **Mobile Testing**: Always test on mobile devices or using browser dev tools' mobile emulation
- **Code Organization**: Follow the established directory structure
- **Authentication**: Use Clerk for all user authentication flows
- **Image Handling**: Use Cloudinary for all media uploads
- **State Management**: Use React hooks for component state, avoid large global state
- **API Communication**: Implement consistent error handling and loading states

### Performance Considerations

- Optimize image sizes for mobile networks
- Implement proper pagination for product/order lists
- Use skeleton loaders for better perceived performance
- Leverage Next.js image optimization features

## 🔨 Running the Application

### Starting the Backend

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Start development server
uvicorn app.main:app --reload
```

### Starting the Frontend

```bash
# Navigate to frontend directory
cd frontend

# Start development server
npm run dev
```

### Accessing the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 🔥 Core Principles

This platform has been built with the following core principles in mind:

### Build for Scale from MVP

- Modular architecture allows for easy expansion
- API versioning to support future changes
- Multi-tenant support planned for future phases

### Mobile-First Design

- Bottom tab navigation optimized for African market users
- Direct camera integration for product management
- Responsive design that works on all device sizes

### Clean, Composable Code

- Component-based architecture in the frontend
- Service pattern in the backend
- Consistent file and directory structure

### Environment-Based Configuration

- Separate development and production settings
- Easy deployment to different environments
- Secrets management through environment variables

### Modular Architecture

- Separation of concerns across all layers
- Pluggable services for easy replacement
- Clear boundaries between components

## 🧪 Testing

### Backend Testing

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Run all tests
python -m pytest

# Run tests with coverage report
python -m pytest --cov=app

# Run specific test file
python -m pytest tests/api/test_products.py

# Run tests with parameterized testing (multiple scenarios)
python -m pytest tests/api/test_products_parameterized.py
```

### Test Structure

- `/tests`: Main test directory
  - `/api`: API endpoint tests
  - `/conftest.py`: Test fixtures and configuration
  - `/test_auth.py`: Authentication tests
  - `/test_db.py`: Database connection tests

### Testing Features

- **Database Isolation**: Each test runs with a clean database state
- **Authentication Mocking**: Pre-configured test tokens for different user roles
- **Parameterized Testing**: Efficient testing of multiple scenarios
- **Transaction Management**: Automatic rollback after tests to prevent test interference

## 🔧 Recent Improvements

### Database & Performance

- **Optimistic Locking**: Prevents data corruption from concurrent modifications

  - Implementation: Version column on models with automatic increment
  - Usage: All update operations check version before committing changes

- **Database Indexing**: Strategic indexes for frequently queried fields

  - Improved Performance: Faster filtering by seller, price, and product status

- **Batch Operations**: Efficient handling of bulk updates

  - Endpoint: `POST /api/v1/products/batch`
  - Use Case: Update multiple products in a single database operation

- **Keyset Pagination**: Cursor-based pagination for large datasets
  - Endpoint: `GET /api/v1/products/keyset`
  - Benefits: Consistent performance regardless of page size or offset

### Security Enhancements

- **Role-Based Access Control**: Fine-grained permissions by user role

  - Roles: `seller`, `admin`, `customer`
  - Implementation: `app/core/security/role_based_auth.py`

- **Audit Logging**: Comprehensive security trail for sensitive operations

  - Tracked Actions: Create, update, delete, and read operations
  - Implementation: `app/services/audit_service.py`

- **Standardized Error Handling**: Consistent error responses across the API

  - Implementation: `app/core/errors/error_response.py`
  - Benefits: Better client experience and easier troubleshooting

- **Request Monitoring**: Performance tracking for API endpoints
  - Implementation: RequestTimingMiddleware in `app/main.py`
  - Features: Automatic logging of slow requests

## 📱 Application Structure

### Backend

- `/app`: Main application code
  - `/api`: API endpoints and routers
  - `/core`: Core functionality
    - `/config`: Environment-based configuration
    - `/security`: Authentication, RBAC, and JWT validation
    - `/errors`: Centralized error handling
    - `/middleware`: Rate limiting and request monitoring
  - `/models`: Database models with indexes for performance
  - `/schemas`: Pydantic schemas for validation
  - `/services`: Business logic layer with optimistic locking
  - `/db`: Database session and connection management

### Frontend

- `/src`: Main source code
  - `/app`: Next.js App Router pages
  - `/components`: Reusable UI components
  - `/hooks`: Custom React hooks
  - `/stores`: Zustand state management
  - `/types`: TypeScript type definitions
  - `/utils`: Utility functions and helpers
  - `/lib`: Utility functions

## 🧑‍💻 For Engineers & Contributors

### Development Workflow

1. **Fork and Clone**: Fork the repository and clone it locally
2. **Branch Strategy**: Create feature branches from `develop`
   - Use descriptive names: `feature/product-batch-api`, `fix/auth-token-issue`
3. **Commit Convention**: Use conventional commits
   - Format: `type(scope): message` (e.g., `feat(products): add batch update endpoint`)
4. **Pull Requests**: Submit PRs to `develop` branch with descriptive titles

### Testing Before Contribution

```bash
# Backend tests - Must pass 100%
cd backend
python -m pytest

# Run specific test scenarios
python -m pytest tests/api/test_products_parameterized.py::test_create_product_validation_cases
python -m pytest tests/api/test_products_parameterized.py::test_list_products_with_filters_parameterized

# Test specific authentication scenarios
python -m pytest tests/test_auth.py::test_dashboard_with_token
```

### Testing Different User Roles

The system supports multiple role-based test tokens:

- `test_token`: Standard seller role
- `other_token`: Another seller (for testing ownership validation)
- `admin_token`: Admin user with elevated privileges
- `customer_token`: Customer role for testing buyer flows

Example usage in tests:

```python
def test_admin_function(client):
    # Get admin privileges
    admin_headers = {"Authorization": "Bearer admin_token"}
    response = client.post("/api/v1/some-admin-endpoint", headers=admin_headers)
    assert response.status_code == 200
```

### African Market Considerations

When developing new features, keep in mind:

1. **Mobile Optimization**: Most users access via mobile devices with varying connection quality
2. **Bandwidth Efficiency**: Minimize payload sizes and implement progressive loading
3. **WhatsApp First**: Prioritize WhatsApp integrations as it's the primary messaging platform
4. **Localization**: Design with multi-language support in mind for future expansion
5. **Payment Methods**: Build with various local payment methods in mind

## 🔒 Security Notes

- All API endpoints are protected with JWT authentication
- Environment variables are used for sensitive configuration
- Media uploads are validated and sanitized
- CORS protection is implemented

## 📝 License

This project is proprietary and confidential.

## 🤝 Contributing

Please contact the repository owner for contribution guidelines.

## 🧹 Code Quality, Linting, and Type Safety

- **Strict ESLint Configuration**: The codebase enforces strict architectural boundaries and type safety using ESLint and TypeScript. All cross-module imports must go through module public APIs (`index.ts`) or DTOs. Direct internal imports and bridge files are prohibited and will be flagged by CI.
- **No Bridge Files**: All legacy bridge files (e.g., `src/types/events.ts`, `src/types/websocket.ts`) have been removed. Types must be imported from their module's public API.
- **No Backup/Test Artifacts**: `.bak`, `.old`, and similar backup/test files are not allowed in the codebase and are regularly cleaned up.
- **CI Enforcement**: All PRs must pass lint (`npm run lint`) and type checks (`npm run type-check`). Violations block merges to protected branches.
- **Type Safety**: No `any` types are allowed. Use `unknown` with type guards for dynamic data. All module boundaries use explicit interfaces and DTOs.

### How to Fix Lint/Type Errors
- **Restricted Import**: Change your import to use the module's public API or DTO file.
- **Unused Variable/Import**: Remove or use the variable/import as needed.
- **Type Error**: Add or refine type annotations, avoid `any`, and use generics or type guards as appropriate.

## WhatsApp Alerting & Seller WhatsApp Number Management

### Overview
- Sellers receive real-time alerts for critical events (new orders, customer inquiries, payments) directly on WhatsApp.
- Each seller/tenant manages their WhatsApp number through an intuitive UI in dashboard settings.
- The system uses Twilio WhatsApp Business API for reliable, high-deliverability messaging.
- Alert content is formatted specifically for the constraints and opportunities of the WhatsApp platform.
- This feature aligns with our core vision of enabling commerce in conversation across African markets.

### Architecture

The WhatsApp alerting system follows our modular monolith architecture:

- **Backend Services**:
  - `alert_service.py`: Core alerting logic with WhatsApp channel integration
  - `whatsapp_alert_service.py`: Dedicated Twilio integration service
- **Frontend Components**:
  - Settings drawer with WhatsApp number configuration
  - Validation and user feedback for number format
- **Data Model**:
  - Extended `Tenant` model with `whatsapp_number` field
  - Proper migrations for database schema updates

### How it Works
1. Seller configures their WhatsApp number in the dashboard (Settings > General).
2. The backend securely stores this number in the tenant profile.
3. When alert-worthy events occur, the system determines appropriate channel(s).
4. For WhatsApp-eligible alerts, a properly formatted message is sent via Twilio.
5. Delivery status is tracked and fallback channels are used if needed.

### API Endpoints
- `GET /tenants/me`: Fetch current tenant profile (including WhatsApp number)
- `PATCH /tenants/me`: Update WhatsApp number for the current tenant

### Environment Variables
```
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_NUMBER=your_whatsapp_number
```

### Testing & Validation
- Add/update WhatsApp number in the dashboard and verify it saves correctly.
- Trigger test events to confirm WhatsApp alert delivery.
- Verify tenant isolation (alerts only go to the correct seller).

### Detailed Documentation
For comprehensive implementation details, configuration options, and troubleshooting, see the [WhatsApp Alerting documentation](./frontend/docs/WHATSAPP_ALERTING.md).
- Ensure only authenticated sellers can update their WhatsApp number.
