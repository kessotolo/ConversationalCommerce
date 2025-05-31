# AI Agent Configuration for ConversationalCommerce

This document serves as a comprehensive guide for AI assistants working on the ConversationalCommerce platform. Follow these principles and rules for all code generation, assistance, and suggestions.

## 🌍 Project Vision and Context

ConversationalCommerce is digitizing how Africans (and eventually the world) conduct commerce through conversation. Think of it as **Shopify for WhatsApp, Instagram, TikTok, and status-based selling**, with mobile-first UX and merchant-first architecture.

**Core Objective**: Enable frictionless product discovery, conversation, checkout, and repeat sales — all inside messaging platforms.

**Target Users**:
- **Sellers**: Small to medium businesses in emerging markets
- **Buyers**: Mobile-first consumers, primarily on Android devices
- **Admins**: Internal and global platform administrators

## 🏗️ Architecture Rules

### Modular Monolith Architecture

- **Structure**: The codebase is organized into isolated modules with clear boundaries within a single deployable unit
- **Module Definitions**:
  - **Core**: Base types, utilities, cross-cutting concerns
  - **Tenant**: Merchant configuration and management
  - **Conversation**: Messaging system
  - **Product**: Product catalog management
  - **Order**: Order processing and transactions
  - **Storefront**: Storefront configuration
  - **Theme**: Theming engine and configuration
  - **Monitoring**: System monitoring and alerts

### Module Boundaries

**Strict Import Rules**:
- **Core**: Cannot import from other modules (base module)
- **Tenant**: Can import from Core
- **Conversation**: Can import from Core, Tenant
- **Product**: Can import from Core, Tenant
- **Order**: Can import from Core, Tenant, Product
- **Storefront**: Can import from Core, Tenant, Product, Order
- **Theme**: Can import from Core, Tenant
- **Monitoring**: Can import from Core

### Import Patterns

```typescript
// ✅ CORRECT: Direct module imports with type imports where appropriate
import type { UUID, Entity } from '@/modules/core/models/base';
import { Status } from '@/modules/core/models/base';

// ❌ INCORRECT: Never use bridge files or centralized type directories
import { UUID } from '@/types/base';  // WRONG!

// ❌ INCORRECT: Never violate module boundaries
import { TenantService } from '@/modules/tenant/services/TenantService'; // WRONG in Core module!
```

### Multi-Tenant Architecture

- Each seller is a tenant with isolated data
- Use PostgreSQL Row-Level Security (RLS) for data isolation
- Support subdomain and custom domain routing
- Respect admin hierarchies: global admin, tenant admin, agency admin

## 💻 Code Quality Standards

### General Rules

- **Clean, readable, well-documented code only**
- **No hacks, band-aid fixes, or TODOs without linked tickets**
- **Strict typing**: TypeScript on frontend, Pydantic v2 on backend
- **No future tech debt allowed**: Even "quick" solutions must follow best practices
- **All code must include**:
  - Tests (unit + integration)
  - Error handling
  - Logging (contextual and redacted)
  - Inline comments for complex logic

### Frontend Specific

- **Built with Next.js + TailwindCSS**
- **Mobile-first design principles**:
  - All screens must be fully usable on low-end Android devices
  - Performance-optimized for low-bandwidth connections
- **React server components** for performance where possible
- **Chat-native UX**: UI interactions should feel like chat - async with real-time feedback
- **TypeScript in strict mode**

### Backend Specific

- **Python (FastAPI) with async-first architecture**
- **Pydantic v2, SQLAlchemy 2, and PostgreSQL**
- **Media storage via Cloudinary**
- **Messaging via Twilio**
- **Clerk for authentication (JWT)**

## 🧠 Product Philosophy Rules

### User Experience Priorities

- **Zero onboarding friction**: Merchant setup should feel like chatting with a friend
- **Async mindset**: Handle messaging delays gracefully
- **Ease of internationalization**: Support for multiple languages and regional slang
- **Trust signals**: Verified merchant badges, SSL, audit logs, fraud detection

### Performance Requirements

- **Product upload in < 10 seconds** including photos/videos
- **No login walls for buyers** — allow direct action from messages
- **Keyboard-first and voice-first interfaces**
- **Optimized for slow internet and low storage**

### AI and Future-Proofing

- **AI-onboardable flows**:
  - Support agent responses to buyers
  - Auto-generate descriptions, titles, and prices
- **Analytics hooks from Day 1**:
  - Event tracking
  - Funnel tracking for onboarding, sales, churn
- **API-first design for automation**

## 🔍 Non-Negotiable Rules for AI Agents

1. **NEVER create bridge files or centralized type directories**
2. **ALWAYS follow module boundaries for imports**
3. **ALWAYS use direct module imports**
4. **ALWAYS use `import type` for type-only imports**
5. **ALWAYS write mobile-first, conversational UI**
6. **NEVER add code without proper error handling and tests**
7. **ALWAYS optimize for low-bandwidth African markets**
8. **NEVER violate multi-tenant data isolation**
9. **ALWAYS follow TypeScript strict mode requirements**
10. **NEVER create complex interfaces without proper documentation**

## 🔄 Verification Methods

- Run `npm run verify:architecture` to verify architectural compliance
- Run `npm run lint` to check code style and import rules
- Run `npm test` to ensure all tests pass
- Review the ESLint rules in `.eslintrc.json` for detailed restrictions

---

By following these guidelines, AI agents will help maintain the architectural integrity, code quality, and product vision of the ConversationalCommerce platform.
