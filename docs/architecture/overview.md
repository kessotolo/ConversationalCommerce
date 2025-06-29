# ConversationalCommerce Architecture Overview

## 🚀 Our Core: Commerce in Conversation

The architecture of ConversationalCommerce is centered on enabling commerce in conversation as the default. All modules, APIs, and flows are designed to work seamlessly in chat (WhatsApp, IG, TikTok, etc.) as well as on the web. The webapp is a complement, but the heart of the platform is enabling every commerce action—discovery, cart, upsell, checkout, payment—through natural conversation, just as Africans do commerce every day.

## System Architecture

ConversationalCommerce follows a modular monolith architecture, which provides:

1. **Clean Module Boundaries** - Clear separation between domain modules
2. **Single Deployment Unit** - Simplified operations and deployment
3. **Explicit Dependencies** - Controlled imports between modules
4. **Scalable Structure** - Ability to extract microservices if needed in the future

### High-Level System Components

```
┌──────────────────────────────────────────────────────────────┐
│                   ConversationalCommerce                     │
│                                                              │
│  ┌────────────┐   ┌────────────┐    ┌────────────────────┐   │
│  │            │   │            │    │                    │   │
│  │  Frontend  │◄──┤    API     │◄───┤  Business Logic    │   │
│  │ (Next.js)  │   │ (FastAPI)  │    │  (Service Layer)   │   │
│  │            │   │            │    │                    │   │
│  └─────┬──────┘   └─────┬──────┘    └──────────┬─────────┘   │
│        │                │                      │             │
│        │                │                      │             │
│  ┌─────▼────────────────▼──────────────────────▼─────────┐   │
│  │                                                       │   │
│  │           PostgreSQL Database + Redis Cache           │   │
│  │                                                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐     │
│  │ WhatsApp API  │  │ Payment APIs  │  │ External APIs │     │
│  └───────────────┘  └───────────────┘  └───────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Multi-Channel Architecture

The platform is designed to work across multiple conversational channels:

- **WhatsApp**: Primary channel for African markets with NLP intent processing
- **Web Interface**: Progressive web app for both buyers and sellers
- **Instagram**: Integration for social commerce (planned)
- **SMS**: Fallback for feature phones and limited connectivity

## Tenant Isolation

Multi-tenancy is a core architectural principle:

1. **Database-Level Isolation**: PostgreSQL Row-Level Security (RLS)
2. **Tenant Context Propagation**: All requests include tenant context
3. **Resource Quotas**: Prevents tenant resource abuse
4. **Dedicated WhatsApp Numbers**: Each seller uses their own WhatsApp phone number

## Event-Driven Architecture

Critical business operations use an event-driven approach:

1. **Domain Events**: Events like OrderCreated, PaymentProcessed are published
2. **Async Processing**: Events are processed asynchronously
3. **Notification System**: Multi-channel notifications based on events
4. **Analytics Pipeline**: Events feed into behavior analysis

## Deployment Architecture

The application is deployed as:

1. **Backend**: FastAPI application on container infrastructure
2. **Frontend**: Next.js application on Vercel
3. **Database**: Managed PostgreSQL instance
4. **Cache**: Redis for session and query caching
5. **Asset Storage**: Cloudinary for media assets

## Security Architecture

Security is implemented at multiple levels:

1. **Authentication**: JWT-based with refresh tokens
2. **Authorization**: Role-based access control (RBAC)
3. **Tenant Isolation**: Database-level through RLS
4. **API Security**: Rate limiting, CORS, and input validation
5. **Payment Security**: PCI-compliant payment processing

## Phase 2 Features

Phase 2 features have been fully implemented (June 2025) and include:
- Buyer Profile Management
- Address Book Management
- Buyer Order Management
- Team Role Management
- Seller Onboarding Admin Review

For detailed information on Phase 2 features, see [phase2-features.md](phase2-features.md).
