# Developer Onboarding Guide: ConversationalCommerce Frontend

## 🚀 Our Core: Commerce in Conversation

Onboarding for ConversationalCommerce is designed to make commerce in conversation the default experience. All onboarding flows, features, and APIs are built to work seamlessly in chat (WhatsApp, IG, TikTok, etc.) as well as on the web. The webapp is a complement, but the heart of the platform is enabling every commerce action—discovery, cart, upsell, checkout, payment—through natural conversation, just as Africans do commerce every day.

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

**Onboarding Vision:** New team members should understand that enabling these entry points is at the heart of our onboarding and user experience vision.

Welcome to the ConversationalCommerce platform! This guide will help you understand our architecture, development practices, and codebase organization so you can quickly become productive.

## 🤝 Trust & Naturalness in Conversational Commerce

Trust is at the heart of commerce in Africa. Our onboarding and user experience are designed so that buyers and sellers always feel like they're talking to real people, not bots. We prioritize:

- **Authentic, Human-Like Chat:** No "bot speak"—conversations use local language, slang, and context-aware replies.
- **Clear Identity:** Always show who is speaking (buyer, seller, or assistant), but keep automation subtle and helpful.
- **Personalization:** Use names, local expressions, and context to make every chat feel personal.
- **Trust Signals:** Verified badges, clear receipts, and confirmations that look and feel like real commerce.
- **Privacy & Security:** Respect for phone numbers and personal info, with clear opt-in/out for notifications.
- **Seamless Human Escalation:** If a conversation gets stuck, it's easy to talk to a real person—no dead ends.

Our conversational engine is trained on real African chat data, supports local dialects, and is always improving to make commerce feel as natural and trustworthy as chatting with a friend or local vendor.

## WhatsApp NLP Cart Management ✅ VERIFIED

We've successfully implemented multi-tenant WhatsApp NLP cart management that meets our core requirements:

- **Seller's Own WhatsApp Numbers**: Each seller uses their own WhatsApp number for customer interactions
- **No Web Chat Interface**: Fully implemented through WhatsApp without requiring a web chat interface
- **Multi-Tenant Support**: Messages correctly route to the appropriate seller based on receiving number
- **Natural Language Commands**: Successfully processes cart operations through natural language
- **Seamless Integration**: Uses the existing NLP pipeline for intent recognition and cart management

As a new developer, here's what you need to know:

1. The implementation uses a webhook endpoint in `/backend/app/api/v1/endpoints/whatsapp.py`
2. Tenant identification happens through the WhatsApp number that receives the message
3. Messages are processed through our existing NLP pipeline in the conversation module
4. Responses are sent back through the seller's WhatsApp number using Twilio
5. Complete documentation is available in `/frontend/docs/WHATSAPP_NLP.md`

## Architecture Overview

The ConversationalCommerce frontend follows a **modular monolith architecture**. This means:

- All code is deployed as a single application
- The codebase is divided into distinct modules with clear boundaries
- Each module has its own domain responsibility
- Modules communicate through well-defined interfaces
- Direct module imports are used instead of centralized type repositories

## Module Structure

Our codebase is organized into these modules:

| Module           | Responsibility                                | Can Import From              |
| ---------------- | --------------------------------------------- | ---------------------------- |
| **Core**         | Base types, utilities, cross-cutting concerns | _None (base module)_         |
| **Tenant**       | Merchant configuration and management         | Core                         |
| **Conversation** | Messaging system                              | Core, Tenant                 |
| **WhatsApp**     | WhatsApp integration and NLP processing       | Core, Tenant, Conversation   |
| **Product**      | Product catalog management                    | Core, Tenant                 |
| **Order**        | Order processing and transactions             | Core, Tenant, Product        |
| **Storefront**   | Storefront configuration                      | Core, Tenant, Product, Order |
| **Theme**        | Theming engine and configuration              | Core, Tenant                 |
| **Monitoring**   | System monitoring and alerts                  | Core                         |

## Import Guidelines

### ✅ DO: Use direct module imports

```typescript
// For type-only imports
import type { UUID, Entity } from '@/modules/core/models/base';

// For value imports (enums, constants, functions)
import { Status } from '@/modules/core/models/base';
```

### ❌ DON'T: Create bridge files or import across module boundaries incorrectly

```typescript
// DON'T: Create centralized type files
// src/types/myTypes.ts - This pattern is not allowed

// DON'T: Import across unauthorized module boundaries
// Core module importing from Tenant module - This would violate module boundaries
```

## Type System

We've standardized on these key types:

- **UUID**: `type UUID = string` - All IDs use this type
- **Entity**: Base interface with `id`, `created_at`, `updated_at` properties
- **TenantScoped**: For multi-tenant data with `tenant_id`

Example:

```typescript
import type { Entity } from '@/modules/core/models/base';

// Extend the base types for domain models
export interface Product extends Entity {
  name: string;
  description: string;
  // id and created_at are already included from Entity
}
```

## Code Quality Tools

We enforce our architecture through:

1. **ESLint Rules**: Prevents unauthorized imports and enforces patterns
2. **TypeScript Strict Mode**: Ensures type safety
3. **Architecture Verification**: Run with `npm run verify:architecture`
4. **Pre-commit Hooks**: Verify code before commits

## Getting Started

1. Review the [Architecture Documentation](ARCHITECTURE.md) for detailed patterns
2. Read the [Architecture Decision Records](../docs/architecture/decisions/) for context
3. Study the [Technical Guide](TECHNICAL_GUIDE.md) for implementation details
4. Run `npm run verify:architecture` to ensure your changes maintain architectural integrity

## Best Practices

1. **Module Placement**: Always place new code in the appropriate module
2. **Type Imports**: Use `import type` for interfaces and types
3. **Module Boundaries**: Respect the defined module dependencies
4. **Component Organization**: Keep related components together in their module
5. **Documentation**: Update docs when making architectural changes

## Need Help?

- Check our [Architecture Decision Records](../docs/architecture/decisions/)
- Review the ESLint errors carefully - they often point to architectural issues
- Ask questions in our #architecture Slack channel

Welcome aboard! We're excited to have you contribute to ConversationalCommerce.

## Code Quality, Linting, and Type Safety

- **Strict ESLint Configuration**: The codebase enforces strict architectural boundaries and type safety using ESLint and TypeScript. All cross-module imports must go through module public APIs (`index.ts`) or DTOs. Direct internal imports and bridge files are prohibited and will be flagged by CI.
- **No Bridge Files**: All legacy bridge files (e.g., `src/types/events.ts`, `src/types/websocket.ts`) have been removed. Types must be imported from their module's public API.
- **No Backup/Test Artifacts**: `.bak`, `.old`, and similar backup/test files are not allowed in the codebase and are regularly cleaned up.
- **CI Enforcement**: All PRs must pass lint (`npm run lint`) and type checks (`npm run type-check`). Violations block merges to protected branches.
- **Type Safety**: No `any` types are allowed. Use `unknown` with type guards for dynamic data. All module boundaries use explicit interfaces and DTOs.

### How to Fix Lint/Type Errors
- **Restricted Import**: Change your import to use the module's public API or DTO file.
- **Unused Variable/Import**: Remove or use the variable/import as needed.
- **Type Error**: Add or refine type annotations, avoid `any`, and use generics or type guards as appropriate.

### Next.js App Router: 'use client' Directive

If you use React hooks (like `useState`, `useEffect`, `useParams`, etc.) in a file under `src/app/`, you **must** add the following as the very first line of the file:

```tsx
'use client';
```

- This tells Next.js that the file is a Client Component and can use browser-only APIs and React hooks.
- If you forget this, your build will fail with errors about hooks only being allowed in client components.
- **Best Practice:** Always add `'use client';` to the top of any file in `src/app/` that uses React hooks or browser APIs.
- This applies to both `.tsx` and `.jsx` files.
- See: [Next.js docs on Client Components](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#client-components)

**CI/Build Tip:**
- Our build scripts and linting will check for this, but you should always double-check when creating or editing App Router pages/components.

# Conversation Event Logging, Analytics, and Clerk Integration

## Event Logging
- All key conversation actions (messages, joins, leaves, closes, etc.) are logged as structured events.
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

## Order Event System

- The backend uses an event-driven architecture for order actions (creation, status change, fulfillment, etc.).
- This enables decoupled notifications, analytics, and fulfillment logic.
- See backend/docs/api/orders.md for event types, payloads, and usage.

- Payment events (e.g., PaymentProcessedEvent) are now part of the backend event system. See backend/docs/api/orders.md for details.
