# Unified Checkout & Order Creation Strategy

This document outlines the implementation strategy for a unified checkout experience across web and conversational interfaces in the ConversationalCommerce platform.

## System Overview

The unified checkout strategy enables customers to complete purchases through either the web UI or conversational interfaces (WhatsApp), using a shared backend that ensures consistent business logic, validation, and order processing.

## Goals

- Create a seamless checkout experience on both web and conversational channels
- Ensure consistent business logic and validation across all interfaces
- Support offline-resilient checkout flows for limited connectivity environments
- Maintain proper tenant isolation in a multi-tenant architecture
- Leverage domain-driven design principles for maintainable, extensible code

## 1. Domain-Driven Design Architecture

```
Domain Model Structure
├── Core Domain
│   ├── Order (Aggregate Root)
│   │   ├── OrderItem
│   │   ├── OrderStatus
│   │   ├── OrderTimeline
│   │   └── ShippingDetails
│   ├── Customer
│   ├── Payment
│   └── Cart
├── Domain Services
│   ├── OrderService
│   ├── PaymentService
│   ├── InventoryService
│   └── NotificationService
└── Domain Events
    ├── OrderCreated
    ├── PaymentProcessed
    ├── OrderShipped
    └── OrderDelivered
```

### Key Architecture Components

1. **Domain Model Layer**:

   - Separate domain models from transport/API models
   - Entity types with business rules enforced within the domain
   - Value objects for immutable concepts (Address, Money, etc.)

2. **Event-Driven Architecture**:

   - Define clear domain events for each state change
   - Event listeners for downstream actions (inventory updates, notifications)
   - Event sourcing for complete order history and audit trail

3. **Service Layer**:
   - Domain services for business logic
   - Application services to orchestrate use cases
   - Tenant-aware services with proper isolation

## 2. Channel-Specific UX

### Web UI Implementation

- Multi-step checkout form with validation
- Address autocomplete with Google Places API
- Guest checkout with account creation option
- Abandoned cart recovery with localStorage
- Order review and confirmation screens
- Responsive design for mobile and desktop
- Offline-resilient with state persistence

### Conversational UI Implementation

- Step-by-step conversation flow for checkout
- Contextual NLP for field extraction and validation
- Rich media for product confirmation (where supported)
- Error recovery and correction flows
- Integration with existing WhatsApp NLP pipeline
- Multi-lingual support for diverse markets
- Support for quick replies and interactive elements

## 3. Technical Implementation

### Domain Models and Validation

```typescript
// Domain models (shared across both channels)
class Order {
  id: UUID;
  tenantId: UUID;
  customerId: UUID;
  items: OrderItem[];
  status: OrderStatus;
  timeline: OrderTimeline[];
  shippingDetails: ShippingDetails;
  paymentDetails: PaymentDetails;
  totalAmount: Money;

  // Domain methods
  canBeCancelled(): boolean {
    return [OrderStatus.PENDING, OrderStatus.PAID].includes(this.status);
  }

  calculateTotal(): Money {
    // Business logic for calculating totals including tax, shipping, etc.
  }
}

// Validation schema (shared between frontend and backend)
const orderValidationSchema = z.object({
  customerId: z.string().uuid().optional(), // Optional for guest checkout
  customerName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  shippingAddress: addressSchema,
  items: z.array(orderItemSchema).min(1),
  paymentMethod: z.enum(['CARD', 'MOBILE_MONEY', 'CASH_ON_DELIVERY', 'BANK_TRANSFER']),
  idempotencyKey: z.string().uuid(),
  // Additional validation
});
```

### Transactional Order Processing

The OrderService will implement transactional processing to ensure data consistency:

- Atomically reserve inventory, create order, and process payment
- Use idempotency keys to prevent duplicate orders
- Emit domain events for downstream processing
- Support multiple payment methods including mobile money
- Provide fallback mechanisms for offline scenarios

### API Controllers

Two entry points sharing the same core business logic:

1. Web API controller for direct HTTP requests
2. Conversation handler for WhatsApp/chat messages

## 4. Event-Driven Notification System

- Order events trigger notifications across appropriate channels
- Channel selection based on order source and customer preferences
- Support for WhatsApp, SMS, email, and web notifications
- Templated notifications with localization support

## 5. Database Implementation

```sql
-- Orders table with proper tenant isolation
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID REFERENCES customers(id),
  order_number TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,
  idempotency_key UUID UNIQUE,
  metadata JSONB,

  -- Encrypted PII
  customer_info BYTEA, -- Encrypted customer info
  shipping_address BYTEA, -- Encrypted shipping address

  CONSTRAINT valid_status CHECK (status IN (
    'PENDING', 'PAID', 'PROCESSING', 'SHIPPED',
    'DELIVERED', 'CANCELLED', 'REFUNDED', 'FAILED'
  ))
);

-- Row-level security for tenant isolation
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON orders
  USING (tenant_id = current_setting('my.tenant_id')::UUID);

-- Order timeline table for complete history
CREATE TABLE order_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB,
  created_by TEXT
);
```

## 6. Implementation Phases

### Phase 1: Domain Model & Event Definition

- Define all domain models, events, and validation schemas
- Implement shared validation libraries
- Set up event publishing/handling infrastructure

### Phase 2: Core Services Implementation

- Implement OrderService with transactional processing
- Build PaymentService with support for multiple payment methods
- Create InventoryService for stock validation and reservation
- Develop NotificationService for multi-channel alerts
- Set up event handlers for order lifecycle events

### Phase 3: Web UI Implementation

- Create responsive checkout form components
- Implement address autocomplete and validation
- Build payment integration components
- Add abandoned cart recovery with localStorage persistence
- Implement order review and confirmation screens
- Add order tracking interface for customers

### Phase 4: Conversational UI Implementation

- Design conversation flow state machine for checkout
- Implement contextual NLP for field extraction
- Create rich message templates for each checkout step
- Build error recovery and correction flows
- Integrate with existing WhatsApp NLP pipeline
- Support multi-lingual conversations

### Phase 5: Security & Compliance

- Implement PII encryption for sensitive customer data
- Add audit logging for all order operations
- Set up fraud detection measures
- Ensure GDPR/local compliance for data handling
- Implement rate limiting and abuse prevention

### Phase 6: Testing & Deployment

- Write comprehensive unit and integration tests
- Create end-to-end test suites for both channels
- Set up synthetic monitoring for checkout flows
- Implement observability and alerting
- Deploy with feature flags for gradual rollout

### Phase 7: Analytics & Optimization

- Add conversion tracking and funnel analytics
- Implement A/B testing for checkout variations
- Create dashboard for order metrics
- Set up anomaly detection for order patterns
- Build tenant-specific analytics views

## 7. API & Integration Architecture

Webhook system for tenant integration:

- Allow sellers to register webhooks for order events
- Secure payload delivery with signatures
- Support retry mechanisms for failed deliveries
- Provide detailed delivery logs

## 8. Multi-channel Order Management Dashboard

- Unified dashboard for all orders regardless of channel
- Order filtering by status, date range, and channel
- Detailed order view with full timeline
- Status update capabilities
- Channel-specific metrics and analytics

## 9. Future-proofing and Extensibility

### Payment Method Abstraction

```typescript
// Payment method interface
interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  processor: PaymentProcessor;
  isEnabled: boolean;
  supportsRefunds: boolean;
  supportsSplitPayments: boolean;
  tenantId: string; // For tenant-specific payment methods
  config: Record<string, any>; // Configurable settings
}
```

### Channel Comparison Matrix

| Feature                  | Web UI                              | Conversational UI                    | Shared Backend                    |
| ------------------------ | ----------------------------------- | ------------------------------------ | --------------------------------- |
| **Customer Information** | Form with validation                | NLP extraction with context          | Shared validation rules           |
| **Address Collection**   | Google Places autocomplete          | Step-by-step with correction         | Geocoding and validation          |
| **Payment Processing**   | Multiple methods with UI            | Simplified options with instructions | Unified payment service           |
| **Order Review**         | Visual summary with items and total | Text summary with confirmation       | Shared order calculation          |
| **Order Confirmation**   | Success page with details           | Confirmation message with order ID   | Event-driven notifications        |
| **Error Handling**       | Form validation with visual cues    | Conversation recovery and guidance   | Consistent validation errors      |
| **Order Tracking**       | Dedicated tracking page             | Status requests via chat             | Shared tracking service           |
| **Abandoned Recovery**   | localStorage + email reminders      | Conversation resumption              | Unified incomplete order handling |
| **Localization**         | UI translation                      | NLP in multiple languages            | Shared localization service       |
| **Analytics**            | Web-specific metrics                | Conversation-specific metrics        | Unified conversion tracking       |

## 10. Integration with Existing Architecture

The unified checkout system will integrate with our existing architecture:

1. **Modular Monolith**: Will follow the established module boundaries and patterns
2. **WhatsApp Integration**: Leverages the existing WhatsApp webhook and NLP pipeline
3. **UUID Standardization**: Uses UUID for all entity identifiers
4. **Performance Optimization**: Implements offline-resilient features for the African market
5. **Multi-tenant Security**: Enforces proper tenant isolation at all levels

## 11. Technical Considerations

### Authentication

- Uses the SafeClerkProvider pattern for web checkout
- WhatsApp checkout tied to customer phone number
- Guest checkout with optional account creation

### Build Process

- Ensures compatibility with current build pipeline
- Proper 'use client' directives for React components in the app router
- Avoids creating new technical debt with bridge files

### Performance

- Optimized for low-bandwidth and intermittent connectivity
- Local state persistence for offline resilience
- Minimal payload sizes for WhatsApp communication

### Analytics, Fulfillment, and Alerting (2024-06)

- Analytics logging is now structured (JSON), fulfillment is event-driven, and alerting is actionable and ready for real integration.
- See backend/README.md and MONITORING.md for details.

## Per-Tenant Payment Test Mode

- Merchants can enable test mode for any payment provider in their payment settings
- When test mode is enabled:
  - Only test cards are accepted (no real charges)
  - The checkout UI displays a test mode banner and test card instructions
- Provider-specific test cards:
  - **Stripe:** 4242 4242 4242 4242 (any future date, any CVC)
  - **Paystack:** 4084 0840 8408 4081 (any future date, any CVC)
  - **Flutterwave:** 5531 8866 5214 2950 (PIN: 1234, Exp: 09/32, CVV: 564)
