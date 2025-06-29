# Developer Onboarding Guide

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

## 🌟 Phase 2 Feature Overview (COMPLETED)

Phase 2 focuses on core buyer and seller account features. As a new developer, here's what you need to know about the recently completed components:

### Buyer Features

#### Profile Management

The `BuyerProfile` component (`/frontend/src/components/buyer/BuyerProfile.tsx`) serves as the container for all profile-related features, including:

- **Profile Editing**: The `ProfileEditForm` component allows users to update their name, email, phone, and password. Secure password management is implemented with validation.
- **Address Book**: The `AddressList` and `AddressForm` components provide full CRUD functionality for managing shipping and billing addresses.
- **Payment Methods**: Saved payment methods management is available through `PaymentMethodManagement`.
- **Notification Preferences**: `NotificationPreferencesForm` lets users manage their communication preferences across different channels.

API interactions are handled by dedicated service files:
- `userService.ts`: Profile management and security settings
- `addressService.ts`: Address book CRUD operations
- `paymentService.ts`: Payment method management

#### Order Management

Buyers can manage their orders through these components:

- **Order List**: `OrderList` provides filterable order history with status tabs and sorting
- **Order Detail**: `OrderDetail` shows comprehensive order information including items, tracking, and status
- **Order Return**: `OrderReturn` handles the return process with item selection

All order-related API calls are centralized in `orderService.ts`.

### Seller Features

#### Team Management

Sellers can manage their team through:

- **TeamManagement**: Container component with tabs for team members and invitations
- **TeamMemberList**: Shows current team members with role management
- **TeamInviteList**: Displays pending invitations
- **TeamInviteForm**: Form for sending new invitations via email or phone

#### Admin Review Dashboard

Admins can review seller onboarding requests with:

- **SellerOnboardingAdminDashboard**: Main container for all verification workflows
- **SellerVerificationStats**: Dashboard metrics for verification statuses
- **SellerVerificationList**: Filterable list of verification requests
- **SellerVerificationDetail**: Detailed review interface with approve/reject actions

Multi-channel notifications for status changes are implemented through `notificationService.ts`.

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

+**API Placement:** All onboarding-related API calls (startOnboarding, submitKYC, setDomain, inviteTeam, uploadKYCFile) are implemented in `src/modules/tenant/api/onboardingApi.ts`. Components and tests should import onboarding API functions from this module. This enables clean separation of concerns, testability, and strict adherence to module boundaries.

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

## Event-Driven Backend, Monitoring, and Alerting (2024-06)

- The backend is now fully event-driven, with all order, payment, and webhook events monitored via Sentry and Prometheus.
- Alerting is automated via Prometheus Alertmanager and WhatsApp for critical events.
- All frontend monitoring and alerting (NotificationCenter, WhatsApp alerts) are integrated with backend events and metrics.
- See backend/README.md and frontend/docs/MONITORING.md for details.

### Analytics, Fulfillment, and Alerting (2024-06)

- Analytics logging is now structured (JSON), fulfillment is event-driven, and alerting is actionable and ready for real integration.
- See backend/README.md and MONITORING.md for details.

## Type Safety and Async/Await Standards

- **No `any` types**: The use of `any` is strictly prohibited. Use explicit interfaces, types, or `unknown` with type guards for dynamic data. All module boundaries must use explicit interfaces. Use generics with constraints for flexible APIs. For record types, use `Record<string, unknown>` instead of `{[key: string]: any}`.
- **All asynchronous code must use async/await**: Do not use callbacks or mix sync and async logic in the same function.
- **Error handling is required for all async flows**: Use try/catch around all await calls that can throw.

---

# QA Checklist

# ConversationalCommerce QA Checklist

This document is for anyone (even non-technical users) to help test the platform. For every new build or feature, add a note here and check off each item as you test it.

---

## How to Use This Checklist
- Read each step and follow the instructions.
- If something doesn't work as described, write a note in the 'Tester Notes' section below.
- Check the box `[x]` when a test passes, or leave it `[ ]` if it fails or needs review.
- Add your own notes or new tests as you go!

---

## 1. Signup & Login
- [ ] Can you sign up as a new user with email/phone?
- [ ] Do you receive a confirmation email or code (if required)?
- [ ] Can you log in with your new account?
- [ ] Can you log out and log back in?
- [ ] Are error messages clear if you enter wrong credentials?
- [ ] Can you reset your password?
- [ ] Can you change your password from your profile?

---

## 2. Store Creation & Onboarding
- [ ] Can you create a new store/tenant after signup?
- [ ] Is the onboarding wizard easy to follow (business info, KYC, domain, team invite)?
- [ ] Can you upload KYC documents and see status updates?
- [ ] Can you set a custom domain or subdomain?
- [ ] Can you invite team members by email or phone?
- [ ] Can you resume onboarding if you leave and come back?
- [ ] Are errors shown clearly if you enter invalid info?

---

## 3. Product Management
- [ ] Can you add a new product (with photo, title, price)?
- [ ] Can you edit and delete products?
- [ ] Is the product list easy to browse and search?
- [ ] Is the empty state clear when there are no products?
- [ ] Can you share a product via WhatsApp, Instagram, TikTok, or Copy Link?

---

## 4. Storefront Access & Customization
- [ ] Can you access your store's public page (storefront)?
- [ ] Does the store load on both desktop and mobile?
- [ ] Can you customize the storefront (logo, banner, theme)?
- [ ] Are changes visible immediately after saving?
- [ ] Can you preview the store as a buyer?

---

## 5. Orders & Checkout
- [ ] Can you add products to the cart as a buyer?
- [ ] Can you view and edit the cart?
- [ ] Can you proceed to checkout and enter shipping info?
- [ ] Are all payment options visible and selectable?
- [ ] Can you place an order and see a confirmation?
- [ ] Do you receive order confirmation (email/SMS/notification)?
- [ ] Can you view your order history as a buyer?
- [ ] Can you cancel or return an order (if allowed)?

---

## 6. Payments (Including Test Mode)
- [ ] Can you enable/disable each payment provider in Payment Settings?
- [ ] Can you enable Test Mode for each provider?
- [ ] Is the test mode banner and test card instructions visible at checkout?
- [ ] Can you pay with the test card for each provider (no real charge)?
- [ ] Does a real card fail in test mode?
- [ ] Does a real card work when test mode is off and provider is live?
- [ ] Are payment errors and confirmations clear?

---

## 7. Team Management
- [ ] Can you invite team members (by email/phone)?
- [ ] Can invited members accept and join the team?
- [ ] Can you assign roles/permissions to team members?
- [ ] Can you remove or change a team member's role?
- [ ] Are permissions enforced (e.g., only admins can change settings)?

---

## 8. Analytics & Dashboard
- [ ] Does the dashboard show real-time sales, orders, and analytics?
- [ ] Are charts and stats accurate and up to date?
- [ ] Are loading, error, and empty states clear?
- [ ] Can you filter or drill down into analytics?

---

## 9. Notifications & Communication
- [ ] Do you receive notifications for key events (order placed, payment received, KYC status, etc.)?
- [ ] Are notifications clear and actionable?
- [ ] Can you opt in/out of email/SMS notifications?

---

## 10. General UX & Accessibility
- [ ] Is the app easy to use on both desktop and mobile?
- [ ] Are all buttons, forms, and links working?
- [ ] Is the language clear and friendly?
- [ ] Are error messages helpful?
- [ ] Is the app accessible (screen reader, keyboard navigation, color contrast)?

---

## Tester Notes (Add issues, questions, or suggestions here)
-

---

## Add New Tests Here
- [ ]

---

Thank you for helping test ConversationalCommerce! Your feedback makes the platform better for everyone.

# Channel Metadata Testing

# Channel Metadata Testing Guide

This document outlines the comprehensive test coverage for the WhatsApp & Channel Metadata Decoupling implementation (Phase 2).

## Test Structure

Our tests ensure that all order creation paths properly create and link channel-specific metadata:

1. **Unit Tests**: Verify individual components work correctly

   - `test_order_service_web.py`: Tests web order creation
   - `test_order_service_whatsapp.py`: Tests WhatsApp order creation
   - `test_order_intent_handler.py`: Tests conversation handling

2. **Integration Tests**: Verify components work together
   - `test_whatsapp_webhook_order_flow.py`: End-to-end flow from webhook to database

## Running Tests

Run specific test types:

```bash
# Run web order tests
pytest tests/services/test_order_service_web.py -v

# Run WhatsApp order tests
pytest tests/services/test_order_service_whatsapp.py -v

# Run conversation handler tests
pytest tests/conversation/test_order_intent_handler.py -v

# Run end-to-end webhook tests
pytest tests/integration/test_whatsapp_webhook_order_flow.py -v
```

Run all tests:

```bash
pytest
```

## Test Coverage

These tests ensure:

1. Web orders correctly create channel metadata with type `storefront`
2. WhatsApp orders correctly create channel metadata with type `whatsapp` and proper messaging details
3. WhatsApp conversation handlers properly pass channel data
4. End-to-end webhook processing correctly creates orders with channel metadata

## Test Design Approach

Tests are designed to verify two key aspects:

1. **Data Decoupling**: Verify that WhatsApp-specific fields are stored in `OrderChannelMeta` rather than inline in the `Order` model
2. **Service Integration**: Verify that appropriate channel data is passed between conversation handlers, order services, and database models

## Future Test Coverage

Areas for further test coverage:

1. Test compatibility layer for legacy API endpoints
2. Performance tests for common queries
3. Tests for backward compatibility with existing clients
