# Backend Service for Conversational Commerce Platform

## 🚀 Our Core: Commerce in Conversation

The backend is architected to make commerce in conversation the default. All APIs, business logic, and analytics are designed to work seamlessly in chat (WhatsApp, IG, TikTok, etc.) as well as on the web. The webapp is a complement, but the heart of the platform is enabling every commerce action—discovery, cart, upsell, checkout, payment—through natural conversation, just as Africans do commerce every day.

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

Trust is at the heart of commerce in Africa. Our backend is designed so that buyers and sellers always feel like they're talking to real people, not bots. We prioritize:

- **Authentic, Human-Like Chat:** No "bot speak"—conversations use local language, slang, and context-aware replies.
- **Clear Identity:** Always show who is speaking (buyer, seller, or assistant), but keep automation subtle and helpful.
- **Personalization:** Use names, local expressions, and context to make every chat feel personal.
- **Trust Signals:** Verified badges, clear receipts, and confirmations that look and feel like real commerce.
- **Privacy & Security:** Respect for phone numbers and personal info, with clear opt-in/out for notifications.
- **Seamless Human Escalation:** If a conversation gets stuck, it's easy to talk to a real person—no dead ends.

Our conversational engine is trained on real African chat data, supports local dialects, and is always improving to make commerce feel as natural and trustworthy as chatting with a friend or local vendor.

## 🔑 UUID Standardization

The ConversationalCommerce platform has standardized on UUID types for database primary keys and foreign keys:

- **Native PostgreSQL UUIDs**: All models use UUID(as_uuid=True) instead of String for ID fields
- **Model Consistency**: Key models like User, SellerProfile, and Order have been updated to use PostgreSQL UUID types
- **Migration Process**: Complex migration scripts handle the conversion from String-based UUID values to actual UUID data types

## 🤝 Model Relationships

- **Tenant-StorefrontConfig Relationship**: One-to-one relationship between Tenant and StorefrontConfig models
  - Defined as `storefront_config = relationship("StorefrontConfig", back_populates="tenant", uselist=False, cascade="all, delete-orphan")`
- **Proper Cascade Behavior**: Ensures that related records are properly deleted when parent records are removed
- **Testing Approach**: Improved testing for authentication by inspecting endpoint function signatures instead of making direct HTTP requests

## 📱 Mobile-First Deployment

This backend is optimized for mobile-first deployment targeting African markets, with consideration for:

- Intermittent connectivity
- Lower bandwidth environments
- Scalable infrastructure
- Multi-platform deployment support

### Deployment Entry Points

Multiple entry points are provided for compatibility across deployment platforms:

- `server.py` - Universal entry point with explicit Python path handling
- `asgi.py` - Simple ASGI entry point for uvicorn
- `wsgi.py` - WSGI compatibility layer

### Deployment Instructions

```bash
# Local development
uvicorn app.main:app --reload

# Production deployment
python server.py
```

## 🧠 NLP Capabilities & Requirements (2025-05-28)

The platform includes advanced NLP (Natural Language Processing) capabilities for content analysis, moderation, and user interaction. These features require specific language models to function properly.

### Required NLP Models

- **spaCy Model**: `en_core_web_sm` - Used for entity recognition, part-of-speech tagging, and linguistic analysis
- **NLTK Data**: Various datasets for tokenization, stopwords, and POS tagging
- **Detoxify**: For toxicity detection in user-generated content

### Ensuring Full NLP Capabilities

There are several ways to ensure all required NLP models are available:

#### Option 1: Use the Provided Setup Script

```bash
# Download all required models and start the application
./backend/scripts/start_with_nlp.sh
```

#### Option 2: Download Models Separately

```bash
# Just download the required models
python backend/scripts/download_nlp_models.py

# Then start the application normally
cd backend && uvicorn app.main:app --reload
```

#### Option 3: Manual Installation

```bash
python -m spacy download en_core_web_sm
python -m nltk.downloader punkt stopwords averaged_perceptron_tagger
pip install detoxify
```

### Troubleshooting

If you encounter NLP-related errors:

1. Verify model installations:

   ```bash
   python backend/scripts/download_nlp_models.py --verify
   ```

2. Check application logs for specific error messages

3. The application will still function with limited NLP capabilities if models cannot be loaded

---

## 🏪 Multi-Tenant Storefront System (2025-05-28)

The platform now includes a comprehensive multi-tenant storefront infrastructure with advanced caching, custom domain support, and optimized performance. This enables merchants to have fully customized storefronts while maintaining proper tenant isolation and security.

### 1. Multi-Tenant Storefront Architecture

- **Tenant-Specific Storefronts:** Each tenant gets a unique storefront with customizable subdomains and custom domains
- **Subdomain Resolution:** Automatic tenant detection via subdomain or custom domain with proper tenant isolation
- **Domain Verification:** DNS-based ownership verification and SSL certificate validation for custom domains
- **Custom Themes & Layouts:** Tenant-specific themes, layouts, and branding capabilities

### 2. Redis-Based Caching Layer

- **Tenant-Isolated Cache:** All cached data is properly isolated by tenant to prevent data leakage
- **Multi-Level Caching Strategy:**
  - Short-term caching (5 min) for frequently changing content (products)
  - Medium-term caching (1 hour) for occasionally changing content (categories, navigation)
  - Long-term caching (2+ hours) for rarely changing content (layout, metadata)
- **Intelligent Cache Invalidation:** Targeted invalidation when products or configuration changes
- **ETag Support:** Optimized responses with ETag-based conditional requests to reduce bandwidth

### 3. Storefront Content API

- **Complete RESTful API:** Comprehensive endpoints for all storefront content needs
- **Performance Optimization:** Cache headers, ETags, and conditional responses
- **Content Types:**
  - Storefront metadata and SEO information
  - Layout configuration
  - Navigation menus
  - Featured products
  - Category listings
  - Product details with variants
  - Related and recommended products
  - Search functionality

### 4. Product Catalog System

- **Advanced Filtering:** Categories, collections, tags, price ranges
- **Optimized Pagination:** Efficient database queries for large catalogs
- **Image Optimization:** Responsive image sizing and transformation system
- **Variant Handling:** Structured organization of product variants and options

### 5. Tenant Theme Configuration System (✅ Implemented)

- **StorefrontTheme Model:** ✅ Implemented comprehensive theme model with color schemes, typography, layout settings, and component styles
- **Theme Variations:** ✅ Support for multiple theme variations per tenant with automatic default theme management
- **Theme Preview Mode:** ✅ Session-based theme preview capability for testing themes before applying
- **Theme Application Service:** ✅ Complete REST API for creating, updating, and applying themes to storefronts

#### Theme Features

- **JSON Schema Validation:** Strong typing and validation for all theme properties
- **Tenant Isolation:** All themes are scoped to specific tenants
- **Preview Middleware:** Session-based theme previewing without affecting the live storefront
- **Default Theme Management:** Automatic designation and fallback to default themes
- **Theme Search:** Find themes by name or description
- **Theme Components:**
  - **Colors:** Primary, secondary, accent, background, text, and semantic colors
  - **Typography:** Font families, sizes, weights, and scaling
  - **Layout:** Container widths, spacing, breakpoints, and responsiveness
  - **Component Styles:** Buttons, cards, forms, and navigation elements

### 6. Error Handling & Security

- **Custom Error Pages:** Branded error pages for invalid subdomains, inactive tenants, etc.
- **Domain Security:** Verification of domain ownership and SSL status
- **Progressive Rate Limiting:** Tenant-specific API rate limits and fair usage policies
- **Tenant Isolation:** Strict tenant boundary enforcement at all layers

## 🚀 Monitoring, Moderation, Enforcement & Dashboard System (2024-03-21)

This platform now includes a robust, extensible, and modern system for real-time monitoring, content moderation, behavior analysis, progressive enforcement, and staff review. Key features:

### 1. Behavior & Content Monitoring Foundation

- **Activity Tracking Middleware:** Captures all API activity, collects request/response data, and feeds it into the behavior analysis engine.
- **Audit Logging:** Tracks security-sensitive operations and user actions for compliance and review.

### 2. Content Moderation System

- **Content Filter Rules & Analysis:** Supports text, sentiment, language, and toxicity analysis (now with real Detoxify integration). Rules engine for pattern matching, thresholds, and custom actions (flag, reject, require review).
- **Review Workflow:** Manual review queue, reviewer assignment, review status tracking, and notifications.
- **API Endpoints:** Manage rules, analyze content, review results, and query moderation history.
- **Database Migrations:** Tables for filter rules and analysis results, with proper indexing and tenant isolation.

### 3. Behavior Analysis & Pattern Detection

- **Behavior Pattern Models:** Define suspicious/risky behaviors with conditions, severity, thresholds, and cooldowns.
- **Pattern Detection & Evidence Collection:** Automated detection, confidence scoring, and evidence gathering (activity, system metrics, user history).
- **Review & Notification:** Review workflow for detections, with in-app notifications for staff.
- **API Endpoints:** Manage patterns, analyze activity, review detections, and list history.
- **Database Migrations:** Tables for patterns, detections, and evidence.

### 4. Enforcement & Progressive Actions

- **Violation Model & Tracking:** Tracks violations (content, behavior, security) with severity, action, status, and resolution notes.
- **Escalation & Enforcement Logic:** Automatic escalation from warning → temp ban → perm ban based on violation history. Enforcement actions: disables user accounts, sets ban durations, and logs all actions.
- **Integration:** Behavior analysis and rules engine now automatically create and escalate violations when detections occur.
- **API Endpoints:** List, filter, retrieve, and resolve violations (with notes).
- **Database Migrations:** Table for violations, with indexes for fast queries.

### 5. Analytics & Dashboarding

- **Statistics & Trends Endpoints:** Backend endpoints for violation counts by type, severity, action, and status. Time-series endpoint for violation trends (for dashboard charts).
- **Frontend Violation Dashboard:** React component for listing, filtering, and reviewing violations. Statistics and trends visualizations. Dialog for viewing and resolving violations with notes.

### 6. Security & Resource Controls

- **Tenant-Aware Rate Limiting & Quotas:** Per-tenant API rate limits, resource quotas, and usage tracking.
- **Progressive Trust System (Planned):** Foundation for trust levels, verification, and feature gating.

### 7. Real-Time Monitoring & Notification

- **WebSocket Service:** Real-time activity monitoring and alerting.
- **Notification System:** In-app, email, and SMS notifications for alerts, reviews, and escalations.

### 8. Codebase Improvements

- **Pydantic Schemas:** For all new models and endpoints.
- **API Router Registration:** All new endpoints are registered and ready for use.
- **Frontend Types:** TypeScript types for violations, stats, and trends.

---

## 🔐 Multi-Tenant Architecture with PostgreSQL RLS

The platform uses PostgreSQL Row-Level Security (RLS) to enforce tenant isolation at the database level, ensuring that data can never be accessed across tenant boundaries even if application-level security is bypassed.

### Key Components

#### 1. Tenant Model and Database Structure

- Each tenant has a unique UUID identifier stored in the `tenants` table
- All data models include a `tenant_id` foreign key reference to the tenant
- All primary keys and foreign keys use PostgreSQL's native UUID type for consistency and scalability
- Tables with RLS enabled:
  - `users`
  - `seller_profiles`
  - `products`
  - `orders`
  - `conversation_history`
  - `ai_config`
  - `storefront_themes`

#### 1.1 Data Model Design Principles

- **UUID Standardization**: All models use `UUID(as_uuid=True)` for IDs and foreign keys
- **Model-level Default Values**: UUID generation is handled at the model level with `default=uuid.uuid4`
- **Tenant Isolation**: Every model (except system-wide configurations) has a tenant_id foreign key
- **Timestamp Tracking**: All models include created_at and updated_at fields

#### 2. Row-Level Security Policies

PostgreSQL RLS policies are applied to all tenant-scoped tables, allowing rows to be read only when the current session's `tenant_id` matches the row's `tenant_id`:

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON table_name
  USING (tenant_id::uuid = current_setting('my.tenant_id')::uuid);
ALTER TABLE table_name FORCE ROW LEVEL SECURITY;
```

#### 3. Tenant Context Middleware

The `TenantMiddleware` class:

- Extracts the tenant ID from the `X-Tenant-ID` header
- Validates that the tenant exists in the database
- Sets the tenant ID in request state for access in dependencies
- Sets the PostgreSQL session variable for RLS enforcement
- Bypasses tenant checks for public endpoints (health checks, docs)

#### 4. Database Session Management

- `set_tenant_id()` function sets the PostgreSQL session variable using parameterized queries
- `get_db()` dependency automatically applies tenant context from request state
- Services use the tenant context for all database operations

### 🚦 Rate Limiting and Resource Quotas

The platform implements tenant-specific rate limiting and resource quotas to ensure fair usage and prevent abuse.

#### 1. Rate Limiting

- **Per-Tenant Limits:**

  - Requests per minute (default: 60)
  - Requests per hour (default: 1000)
  - Requests per day (default: 10000)

- **Rate Limit Headers:**
  ```
  X-RateLimit-Limit-Minute: 60
  X-RateLimit-Remaining-Minute: 59
  X-RateLimit-Limit-Hour: 1000
  X-RateLimit-Remaining-Hour: 999
  X-RateLimit-Limit-Day: 10000
  X-RateLimit-Remaining-Day: 9999
  ```

#### 2. Resource Quotas

- **Storage Limits:**

  - Maximum storage per tenant (default: 1GB)
  - Current storage usage tracking

- **Product Limits:**

  - Maximum products per tenant (default: 1000)
  - Current product count tracking

- **User Limits:**
  - Maximum users per tenant (default: 100)
  - Current user count tracking

#### 3. API Usage Tracking

- Tracks API calls at multiple time intervals:
  - Per minute
  - Per hour
  - Per day
- Automatically resets counters daily
- Persists usage data in the database

### 🔒 Progressive Trust System (Planned)

The platform will implement a comprehensive progressive trust system to ensure platform security and enable feature access based on seller trustworthiness.

#### 1. Trust Levels

- **Level 0: Unverified Seller**

  - Basic profile creation
  - Limited to 5 product listings
  - Manual order processing
  - Basic store features

- **Level 1: Verified Seller**

  - Email and phone verified
  - Business details verified
  - Up to 50 product listings
  - Basic automation features
  - Payment processing enabled

- **Level 2: Trusted Seller**

  - Business registration verified
  - Tax information verified
  - Full product listing capacity
  - Advanced automation features
  - Priority support access
  - Bulk operations enabled

- **Level 3: Premium Seller**
  - All verifications complete
  - Excellent performance metrics
  - Unlimited products
  - Full platform features
  - API access
  - Custom integrations

#### 2. Verification Process

- **Basic Verification**

  - Email verification
  - Phone number verification
  - Basic business information
  - Store setup completion

- **Business Verification**

  - Business registration document
  - Tax identification
  - Business address verification
  - Bank account verification

- **Performance Verification**
  - Order fulfillment rate
  - Customer satisfaction metrics
  - Response time metrics
  - Dispute resolution rate

#### 3. Trust Score System

The trust score will be calculated based on:

- Account age
- Order volume
- Customer ratings
- Response time
- Dispute resolution rate
- Payment history
- Platform rule compliance

#### 4. Feature Access by Level

- **Level 0 Features**

  - Basic store setup
  - Manual order management
  - Basic product listings
  - Standard support

- **Level 1 Features**

  - Automated order processing
  - Basic analytics
  - Email notifications
  - Payment processing

- **Level 2 Features**

  - Advanced analytics
  - Bulk operations
  - Custom automation rules
  - Priority support

- **Level 3 Features**
  - API access
  - Custom integrations
  - Advanced automation
  - Dedicated support

#### 5. Monitoring and Review

- Regular trust score updates
- Automated level progression
- Manual review triggers
- Performance monitoring
- Compliance checks

#### 6. Risk Management

- Fraud detection
- Suspicious activity monitoring
- Automated risk assessment
- Level demotion triggers
- Account suspension criteria

### Using Tenant Context in New Code

When developing new features, ensure proper tenant isolation by following these patterns:

#### In API Endpoints

```python
@router.post("/some-endpoint")
async def create_something_endpoint(
    data_in: SomeSchema,
    request: Request,  # Include request for tenant context
    db: Session = Depends(get_db),
    user: ClerkTokenData = Depends(require_auth),
):
    # Pass request to service functions for tenant context
    result = create_something(db, data_in, request)
    return result
```

#### In Service Functions

```python
def create_something(db: Session, data_in: SomeSchema, request: Request = None) -> Model:
    # Convert data
    data = data_in.model_dump()

    # Get tenant ID from request context if not already set
    if request and not data.get('tenant_id'):
        tenant_id = get_tenant_id_from_request(request)
        if tenant_id:
            data['tenant_id'] = tenant_id

    # Create model with tenant ID included
    new_item = Model(**data)
    db.add(new_item)
    db.commit()
    return new_item
```

### Testing Tenant Isolation

Integration tests in `tests/integration/test_tenant_rls.py` demonstrate how to test tenant isolation:

```python
# Set tenant context for first tenant
set_tenant_id(db, str(tenant1_id))

# Should only see tenant 1's data
products = db.query(Product).all()
assert len(products) == 1
assert products[0].tenant_id == tenant1_id

# Switch to tenant 2 context
set_tenant_id(db, str(tenant2_id))

# Should only see tenant 2's data
products = db.query(Product).all()
assert len(products) == 1
assert products[0].tenant_id == tenant2_id
```

## 🛠️ Order API & Service Refactor (2024-06)

- All business logic and validation for order operations is now centralized in the service layer (`order_service.py`).
- API endpoints are thin and focused on HTTP concerns, delegating all business logic to the service.
- A DRY error handler decorator is used on all order endpoints to map custom service exceptions to standardized HTTP responses.
- Transaction boundaries are managed by a `@transactional` decorator in the service layer, ensuring atomicity and rollback on error.
- A custom exception hierarchy (`OrderError`, `OrderNotFoundError`, `OrderValidationError`) is used for robust, expressive error handling in the service layer.
- Error-to-HTTP mapping is now centralized and consistent, improving maintainability and client experience.
- All tests and documentation have been updated to reflect these changes, and the codebase is now easier to extend and maintain for future contributors.

## 🛠️ Development Setup

### Prerequisites

- Python 3.10+
- PostgreSQL 15+
- Virtualenv or similar

### Installation

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env

# Run database migrations
alembic upgrade head
```

### Environment Variables

Required environment variables in `.env`:

```
DATABASE_URL=postgresql://user:password@localhost/dbname
PROJECT_NAME=Conversational Commerce
ENVIRONMENT=development
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

### Running the Application

```bash
# Start the development server
uvicorn app.main:app --reload

# Run tests
pytest

# Run linting
flake8
```

## 📚 API Documentation

Once the application is running, you can access:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/api/v1/openapi.json`

### 🔍 Real-Time Monitoring System

The platform implements a comprehensive real-time monitoring system to track activities, detect anomalies, and maintain system security.

#### 1. Activity Tracking

- **Activity Tracker Middleware**

  - Tracks all API requests and responses
  - Records user actions, resource access, and system events
  - Captures detailed event_metadata for each activity
  - Stores activities in the audit log

- **Activity Types**
  - User authentication
  - Resource creation/modification/deletion
  - API calls
  - System events
  - Security events

#### 2. Rules Engine

- **Rule Management**

  - Create, update, and delete monitoring rules
  - Define conditions based on activity patterns
  - Set severity levels (LOW, MEDIUM, HIGH, CRITICAL)
  - Enable/disable rules per tenant

- **Rule Conditions**

  - Field-based conditions
  - Time-based conditions
  - Pattern matching
  - Threshold monitoring
  - Custom operators

- **Rule Evaluation**
  - Real-time evaluation of activities
  - Historical data analysis
  - Cooldown periods to prevent alert fatigue
  - Severity-based notification channels

#### 3. WebSocket Service

- **Real-time Updates**

  - WebSocket connections for live monitoring
  - Tenant-specific channels
  - Activity broadcasting
  - Connection management

- **Connection Features**
  - Automatic reconnection
  - Heartbeat mechanism
  - Connection state management
  - Error handling

### 🔔 Notification System

The platform provides a multi-channel notification system to keep users informed about important events and alerts.

#### 1. Notification Channels

- **In-App Notifications**

  - Real-time WebSocket delivery
  - Priority-based styling
  - Interactive notifications
  - Mark as read functionality

- **Email Notifications**

  - HTML and plain text support
  - Priority-based subject lines
  - Detailed message formatting
  - Tenant-specific email templates

- **SMS Notifications**
  - Twilio integration
  - Priority-based delivery
  - Concise message formatting
  - Delivery status tracking

#### 2. Notification Features

- **Priority Levels**

  - URGENT (red)
  - HIGH (orange)
  - MEDIUM (blue)
  - LOW (green)

- **Notification Management**

  - Mark as read/unread
  - Delete notifications
  - Filter by priority
  - Search functionality

- **Notification Center**
  - Real-time updates
  - Unread count badge
  - Priority indicators
  - Detailed view with event_metadata

#### 3. Integration with Rules Engine

- **Automatic Notifications**

  - Rule-triggered alerts
  - Severity-based channel selection
  - Cooldown periods
  - Detailed context in messages

- **Notification Templates**
  - Rule-specific templates
  - Dynamic content insertion
  - Multi-language support
  - Tenant customization

### 🛡️ Security Features

The platform implements several security features to protect tenant data and system integrity.

#### 1. Rate Limiting

- **Per-Tenant Limits**

  - Requests per minute
  - Requests per hour
  - Requests per day
  - Custom limits per tenant

- **Rate Limit Headers**
  - Remaining requests
  - Reset times
  - Limit information

#### 2. Resource Quotas

- **Storage Limits**

  - Per-tenant storage quotas
  - Usage tracking
  - Automatic cleanup

- **API Usage**
  - Call limits
  - Usage tracking
  - Quota enforcement

#### 3. Activity Monitoring

- **Suspicious Activity Detection**

  - Pattern recognition
  - Anomaly detection
  - Automated alerts
  - Response actions

- **Audit Logging**
  - Comprehensive activity tracking
  - User action logging
  - System event logging
  - Security event logging

### 🛡️ Content Moderation System

The platform implements a comprehensive content moderation system to ensure content quality and compliance.

#### 1. Content Analysis Service

- **Text Analysis**

  - Pattern matching
  - Regular expression support
  - Token analysis
  - Stop word filtering

- **Sentiment Analysis**

  - Polarity detection
  - Subjectivity analysis
  - Threshold-based flagging

- **Language Analysis**

  - Entity recognition
  - Part-of-speech tagging
  - Noun phrase extraction
  - Linguistic feature detection

- **Toxicity Detection**
  - Toxic language detection
  - Category-based analysis
  - Score-based flagging

#### 2. Filter Rules Engine

- **Rule Management**

  - Create, update, and delete rules
  - Enable/disable rules
  - Rule prioritization
  - Tenant-specific rules

- **Rule Types**

  - Text pattern matching
  - Sentiment thresholds
  - Language requirements
  - Toxicity thresholds

- **Rule Actions**
  - Flag for review
  - Auto-reject
  - Require manual review
  - Custom actions

#### 3. Content Review Workflow

- **Review Process**

  - Manual review queue
  - Review status tracking
  - Reviewer assignment
  - Review history

- **Review Actions**

  - Approve content
  - Reject content
  - Request changes
  - Escalate to admin

- **Review Notifications**
  - Review requests
  - Status updates
  - Action notifications
  - Escalation alerts

#### 4. Automated Content Checking

- **Real-time Analysis**

  - Immediate content checking
  - Batch processing
  - Scheduled scans
  - Historical content review

- **Analysis Results**

  - Detailed analysis reports
  - Match explanations
  - Confidence scores
  - Action recommendations

- **Integration Points**
  - Product listings
  - Customer reviews
  - Messages
  - User-generated content

#### 5. Content Moderation Dashboard

- **Overview**

  - Pending reviews
  - Recent actions
  - Statistics
  - Performance metrics

- **Review Interface**

  - Content preview
  - Analysis details
  - Action buttons
  - Comment system

- **Management Tools**
  - Rule configuration
  - User management
  - Settings
  - Reports

## WhatsAppAlerting & Seller WhatsApp Number Management

- Sellers/tenants can now receive WhatsApp alerts for critical events (e.g., new orders, complaints).
- Each tenant profile includes a `whatsapp_number` field (E.164 format).
- Twilio WhatsApp API is used for sending alerts.
- New API endpoints: `GET /tenants/me` and `PATCH /tenants/me` for profile management.
- Test: Update WhatsApp number, trigger an alert, and confirm WhatsApp delivery.

# Alembic Migration Workflow & Best Practices

All database migrations are managed using Alembic in the backend directory. To ensure smooth migrations and avoid import errors:

- Always run Alembic commands from the `backend` directory.
- Always activate the backend virtual environment first:
  ```bash
  cd backend
  source venv/bin/activate
  alembic <command>
  ```
- Do NOT use or create a root-level Alembic directory. All migrations and env.py config are in `backend/alembic`.
- If you see `ModuleNotFoundError: No module named 'app'`, you are likely running Alembic from the wrong directory or without the venv activated.
- To upgrade Alembic:
  ```bash
  pip install --upgrade alembic
  ```
- To check migration status:
  ```bash
  alembic current
  alembic upgrade head
  ```
- If you have migration issues, check your virtual environment and working directory first.

**Recent Fixes:**
- Removed duplicate/root-level Alembic config.
- Created and activated a backend virtual environment.
- Upgraded Alembic to the latest version.
- Confirmed all migrations are up to date and working.

## WhatsAppOrderDetails Model Refactor

- WhatsApp-specific order metadata (whatsapp_number, message_id, conversation_id) is now stored in a dedicated WhatsAppOrderDetails model, linked one-to-one with Order.
- This refactor improves single responsibility, data integrity, and makes it easy to add support for other conversational channels in the future.
- See backend/docs/api/orders.md for API details and example responses.

## Order Event System

- The backend uses an event-driven architecture for order actions (creation, status change, fulfillment, etc.).
- Events are defined in `app/domain/events/order_events.py` and handled via the async event bus in `app/domain/events/event_bus.py`.
- See backend/docs/api/orders.md for event types, payloads, and usage.
- Payment events (e.g., PaymentProcessedEvent) are now emitted and handled for notifications, analytics, and fulfillment.
