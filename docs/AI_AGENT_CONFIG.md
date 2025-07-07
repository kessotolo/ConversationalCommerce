# AI Agent Configuration for ConversationalCommerce

## 🚀 Core Product Philosophy: Commerce in Conversation

The heart of ConversationalCommerce is enabling true commerce in conversation. All AI agents must prioritize conversational flows as the primary channel for commerce—reflecting how Africans buy and sell. The webapp is a complement, not the main channel. Every feature, suggestion, and code generation must reinforce this philosophy: every commerce action (discovery, cart, upsell, checkout, payment) should be possible and natural in chat.

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
import { UUID } from '@/types/base'; // WRONG!

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
- **No use of `any` type in TypeScript**: All code must use explicit interfaces, types, or `unknown` with type guards for dynamic data. Module boundaries must use explicit interfaces. Use generics with constraints for flexible APIs. For record types, use `Record<string, unknown>` instead of `{[key: string]: any}`.

### Async/Await and Asynchronous Code

- **All asynchronous code must use async/await**: Do not use callbacks or mix sync and async logic in the same function.
- **Error handling is required for all async flows**: Use try/catch around all await calls that can throw.
- **All async functions must be fully typed**: Never use `any` in async function signatures or return types.
- **Async flows must be documented and tested**: All async logic must have corresponding tests and inline comments for complex flows.

### Frontend Specific

- **Built with Next.js + TailwindCSS**
- **For all new frontend features and UI components, prefer using shadcn/ui primitives. Existing custom UI kit can be maintained for legacy code, but new work should use shadcn/ui for consistency, accessibility, and maintainability.**
- **Mobile-first design principles**:
  - All screens must be fully usable on low-end Android devices
  - Performance-optimized for low-bandwidth connections
- **React server components** for performance where possible
- **Chat-native UX**: UI interactions should feel like chat - async with real-time feedback
- **TypeScript in strict mode**
- **Navigation must use the MobileNav component (see src/components/MobileNav.tsx)**
- **Onboarding must use a soft, non-blocking prompt card at the top of the dashboard (web & mobile)**
- **Onboarding wizard is launched from the card/modal, not as a forced flow**
- **Sticky bottom nav is used for mobile admin dashboard**

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
- **Soft onboarding only**: Never block users from exploring the app; always use a dismissible onboarding prompt card and modal wizard (Shopify-style)

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

1. **Commerce in Conversation First:** All AI agents must prioritize conversational flows as the default for commerce. The webapp is a fallback or complement.
2. **NEVER create bridge files or centralized type directories**
3. **ALWAYS follow module boundaries for imports**
4. **ALWAYS use direct module imports**
5. **ALWAYS use `import type` for type-only imports**
6. **ALWAYS write mobile-first, conversational UI**
7. **NEVER add code without proper error handling and tests**
8. **ALWAYS optimize for low-bandwidth African markets**
9. **NEVER violate multi-tenant data isolation**
10. **ALWAYS follow TypeScript strict mode requirements**
11. **NEVER create complex interfaces without proper documentation**
12. **🚨 CRITICAL: NEVER delete real API functionality in favor of mock/placeholder code**
13. **🚨 CRITICAL: ALWAYS verify that "legacy" code isn't actually the real implementation**
14. **🚨 CRITICAL: When comparing implementations, prioritize real API calls over UI modernness**
15. **🚨 CRITICAL: App Router is preferred, but ONLY when connected to real backend functionality**
16. **🚨 CRITICAL: Before deleting any code, verify it's not the only working implementation**

## 🔄 Enhanced Verification Methods

### **Pre-Deletion Checklist**
Before removing ANY code, AI agents MUST verify:
1. **API Integration**: Does the code make real API calls vs mock data?
2. **Functionality Comparison**: Is the "legacy" version actually more functional?
3. **Dependencies**: Are other parts of the system depending on this code?
4. **Build Impact**: Will removal break the build or remove working features?
5. **User Impact**: Will users lose access to working functionality?

### **Code Quality Assessment Priority**
When comparing implementations, prioritize in this order:
1. **Real API Integration** (highest priority)
2. **Error Handling & User Feedback**
3. **Type Safety & Documentation**
4. **Modern Architecture (App Router, etc.)**
5. **UI/UX Improvements** (lowest priority)

### **Future-Proofing Standards**
- **Real over Mock**: Always choose real API functionality over placeholder code
- **Working over Modern**: Functional code takes precedence over architectural modernness
- **Incremental Upgrades**: Upgrade architecture while preserving functionality
- **Verification Required**: All architectural changes must maintain or improve functionality

## 🔄 Verification Methods

- Run `npm run verify:architecture` to verify architectural compliance
- Run `npm run lint` to check code style and import rules
- Run `npm test` to ensure all tests pass
- Review the ESLint rules in `.eslintrc.json` for detailed restrictions

## 📊 Event Logging & Analytics Extensibility

- The codebase uses a single-source-of-truth pattern for event logging (see ConversationEvent model/schema/interface)
- All analytics and monitoring should use the extensible ConversationEvent pattern
- When adding new event types, update both backend (enum, schema) and frontend (enum, interface)
- See ARCHITECTURE.md for details

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

**AI Agent Guidance:** When generating code, documentation, or suggestions, always consider these entry points as part of the core conversational commerce experience.

## 📐 TypeScript Strictness & Best Practices

Typescript is used throughout the codebase to ensure type safety and prevent runtime errors. Follow these guidelines for all TypeScript code:

### Type Safety Rules

- **Avoid `any` type**: Never use the `any` type. Use proper type definitions or `unknown` when the type is genuinely unknown.
- **Use Non-nullable Variables**: Never assume a variable is defined. Always use proper null checking and default values.
- **Unwrap Result Types**: Many service methods return a `Result<T, Error>` type. Always check `success` before accessing `data`.
- **Explicit Return Types**: Always specify return types for functions and methods unless they're simple expressions.
- **No Non-null Assertions**: Do not use the non-null assertion operator (`!`). Use proper null checking instead.
- **Proper Import Patterns**: Use type-only imports when importing only types: `import type { MyType } from './types'`.
- **Remove Unused Variables**: Use the `_` prefix for intentionally unused parameters.
- **Strict Component Props**: All React component props must have explicit interface definitions.
- **Explicit Error Handling**: All promises must have proper error handling with specific error types.

### Service Layer Pattern

- **Async Patterns**: All service methods should be async and return a Promise or Result type.
- **Result Type Usage**: Use the `Result<T, E>` pattern with `success`, `data`, and `error` properties.
- **API Types**: Maintain dedicated request/response type interfaces in the same file as the service.

## 🤝 Trust & Naturalness in Conversational Commerce

Trust is at the heart of commerce in Africa. AI agents must always prioritize trust, naturalness, and local context in all conversational flows. The platform is designed so that buyers and sellers always feel like they're talking to real people, not bots. AI agents must:

- **Generate Authentic, Human-Like Chat:** No "bot speak"—use local language, slang, and context-aware replies.
- **Maintain Clear Identity:** Always show who is speaking (buyer, seller, or assistant), but keep automation subtle and helpful.
- **Personalize Interactions:** Use names, local expressions, and context to make every chat feel personal.
- **Reinforce Trust Signals:** Use verified badges, clear receipts, and confirmations that look and feel like real commerce.
- **Respect Privacy & Security:** Never expose phone numbers or personal info unnecessarily, always provide opt-in/out for notifications.
- **Enable Seamless Human Escalation:** Always provide a way to talk to a real person if needed—no dead ends.

AI agents must never generate code or suggestions that break these principles. The goal is to make commerce feel as natural and trustworthy as chatting with a friend or local vendor.

## 📅 2024-06 Update

- **Order business logic is now in the service layer (`order_service.py`), with DRY error handling, transaction management, and a custom exception hierarchy. API endpoints are thin and use a decorator for error-to-HTTP mapping.**

## 🧹 2024: Initial Build & Type Safety Enforcement (Summary)

### Systematic Cleanup Achievements
- Eliminated all `any` types; replaced with explicit interfaces, generics, or `unknown` with type guards
- Removed all unused variables, imports, and forbidden `require()` usage
- Consolidated all model interfaces (e.g., Product, Order, StorefrontComponent) to require `created_at: string` and canonical base types
- Enforced direct module imports and removed all bridge files (no `/types/` directory usage)
- Fixed all index signature property access (TS4111) and strict optional property errors
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

### 2024 Product Upload & Sharing UX Update

- **Quick Upload:** Mobile-first, floating button for instant product upload (photo/video, title, price) on dashboard/products page.
- **Emoji-based Empty State:** 📦 emoji is used for empty product lists (no more broken images).
- **Share Modal:** After upload, sellers can share products via WhatsApp, Instagram, TikTok, or Copy Link using a modal with emoji icons (no external icon dependencies).
- **No pop-up tips or legacy image placeholders remain.**

## 🧩 Orchestration & Modularization (Non-Negotiable)
- Never concentrate business logic in large, monolithic files or "god objects."
- Always use orchestration patterns: break down complex workflows into small, focused services, handlers, or orchestrators.
- Service files: Max 500 lines. Functions/methods: Max 50 lines. If exceeded, split into orchestrator + sub-services/handlers.
- Orchestrators coordinate; sub-services/handlers have single responsibility.
- All business logic must be in service classes/functions, not endpoints/controllers.
- Endpoints/controllers must be thin, delegating orchestration to services.
- For multi-step processes, use a dedicated orchestrator or handler that calls smaller, single-purpose services.
- Use events and handlers for decoupling (event-driven patterns).
- If a file grows beyond ~200 lines or covers more than one responsibility, split it.
- Never allow a file to become a "god file."

AI agents and contributors must enforce these rules in all code generation, reviews, and refactors.

By following these guidelines, AI agents will help maintain the architectural integrity, code quality, and product vision of the ConversationalCommerce platform.

## Background Job/Event Handling (2025)
- All notification and fulfillment events are now handled via Celery + Redis background jobs.
- This ensures robust retry, dead-lettering, and async event-driven architecture.
- AI agents and contributors must enqueue tasks for notifications/fulfillment, not call services directly.
- See backend/README.md and app/tasks.py for implementation details.
