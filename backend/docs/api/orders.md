# Order API Documentation

> **Note:** All database migrations are managed using Alembic in the backend directory. For migration workflow and troubleshooting, see `backend/README.md`.

## Overview

The Order API enables managing the full lifecycle of orders across multiple channels (website, WhatsApp, Instagram) in the Conversational Commerce platform. These endpoints support creating, retrieving, updating, and deleting orders with appropriate validation, error handling, and security controls.

## Key Concepts

- **Multi-Channel Orders**: Orders can originate from website, WhatsApp, or Instagram with channel-specific metadata
- **Tenant Isolation**: All endpoints enforce seller-based tenant isolation for security
- **Optimistic Locking**: Order updates use versioning to prevent concurrent modification issues
- **Status Workflow**: Orders follow a defined lifecycle from pending to delivered/cancelled

## Authentication

All endpoints require authentication using JWT Bearer tokens. Include the token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### Create Order

Creates a new order from web or Instagram sources.

```
POST /api/v1/orders
```

**Request Body:**

```json
{
  "product_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "buyer_name": "John Doe",
  "buyer_phone": "+2547XXXXXXXX",
  "buyer_email": "customer@example.com", // Required for website orders
  "buyer_address": "123 Main St, Nairobi",
  "quantity": 2,
  "total_amount": 59.98,
  "notes": "Please deliver before 5pm",
  "order_source": "website" // "website" or "instagram"
}
```

**Response:** (201 Created)

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "product_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "seller_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "buyer_name": "John Doe",
  "buyer_phone": "+2547XXXXXXXX",
  "buyer_email": "customer@example.com",
  "buyer_address": "123 Main St, Nairobi",
  "quantity": 2,
  "total_amount": "59.98",
  "notes": "Please deliver before 5pm",
  "order_source": "website",
  "status": "pending",
  "created_at": "2025-06-08T22:12:05",
  "updated_at": "2025-06-08T22:12:05",
  "version": 1
}
```

**Error Responses:**

- `404 Not Found`: Product not found
- `422 Validation Error`: Invalid input data
- `401/403`: Authentication/Authorization error

### Create WhatsApp Order

Creates an order originating from WhatsApp conversations.

```
POST /api/v1/orders/whatsapp
```

**Request Body:**

```json
{
  "product_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "buyer_name": "John Doe",
  "buyer_phone": "+2547XXXXXXXX",
  "quantity": 1,
  "total_amount": 29.99,
  "channel_metadata": {
    "whatsapp_number": "+2547XXXXXXXX",
    "message_id": "wamid.abcd1234",
    "chat_session_id": "conv_abcd1234",
    "user_response_log": "Sample user response data"
  }
}
```

**Response:** (201 Created)

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "product_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "seller_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "buyer_name": "John Doe",
  "buyer_phone": "+2547XXXXXXXX",
  "quantity": 1,
  "total_amount": "29.99",
  "order_source": "whatsapp",
  "status": "pending",
  "whatsapp_details": {
    "whatsapp_number": "+2547XXXXXXXX",
    "message_id": "wamid.abcd1234",
    "conversation_id": "conv_abcd1234"
  },
  "created_at": "2025-06-08T22:12:05",
  "updated_at": "2025-06-08T22:12:05",
  "version": 1
}
```

### List Orders

Retrieves a paginated list of orders with optional filtering.

```
GET /api/v1/orders
```

**Query Parameters:**

- `status` (optional): Filter by order status (`pending`, `confirmed`, `shipped`, `delivered`, `cancelled`)
- `order_source` (optional): Filter by source (`website`, `whatsapp`, `instagram`)
- `search` (optional): Search in buyer name, phone, or email
- `start_date` (optional): Filter orders created on or after this date (ISO format)
- `end_date` (optional): Filter orders created on or before this date (ISO format)
- `limit` (optional, default=100): Maximum number of orders to return
- `skip` (optional, default=0): Number of orders to skip for pagination

**Response:** (200 OK)

```json
{
  "total": 42,
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "product_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "seller_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "buyer_name": "John Doe",
      "buyer_phone": "+2547XXXXXXXX",
      "buyer_email": "customer@example.com",
      "quantity": 2,
      "total_amount": "59.98",
      "order_source": "website",
      "status": "pending",
      "created_at": "2025-06-08T22:12:05",
      "updated_at": "2025-06-08T22:12:05"
    }
    // Additional orders...
  ]
}
```

### Get WhatsApp Orders by Number

Retrieves orders associated with a specific WhatsApp number.

```
GET /api/v1/orders/whatsapp?whatsapp_number={whatsapp_number}
```

**Query Parameters:**

- `whatsapp_number`: WhatsApp phone number (E.164 format, e.g., +2547XXXXXXXX)

**Query Parameters:**

- `status` (optional): Filter by order status
- `limit` (optional, default=100): Maximum number of orders to return
- `skip` (optional, default=0): Number of orders to skip for pagination

**Response:** (200 OK)

```json
{
  "total": 3,
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "product_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "seller_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "buyer_name": "John Doe",
      "buyer_phone": "+2547XXXXXXXX",
      "quantity": 1,
      "total_amount": "29.99",
      "order_source": "whatsapp",
      "status": "pending",
      "channel_metadata": {
        "channel": "whatsapp",
        "whatsapp_number": "+2547XXXXXXXX",
        "message_id": "wamid.abcd1234",
        "chat_session_id": "conv_abcd1234",
        "user_response_log": "Sample user response data"
      },
      "created_at": "2025-06-08T22:12:05",
      "updated_at": "2025-06-08T22:12:05"
    }
    // Additional orders...
  ]
}
```

### Get Order by ID

Retrieves a specific order by its unique ID.

```
GET /api/v1/orders/{order_id}
```

**Path Parameters:**

- `order_id`: UUID of the order to retrieve

**Response:** (200 OK)

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "product_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "seller_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "buyer_name": "John Doe",
  "buyer_phone": "+2547XXXXXXXX",
  "buyer_email": "customer@example.com",
  "buyer_address": "123 Main St, Nairobi",
  "quantity": 2,
  "total_amount": "59.98",
  "notes": "Please deliver before 5pm",
  "order_source": "website",
  "status": "pending",
  "created_at": "2025-06-08T22:12:05",
  "updated_at": "2025-06-08T22:12:05",
  "version": 1
}
```

### Update Order

Updates an order's information with optimistic locking to prevent concurrent modifications.

```
PUT /api/v1/orders/{order_id}
```

**Path Parameters:**

- `order_id`: UUID of the order to update

**Request Body:**

```json
{
  "buyer_name": "John Doe Updated",
  "status": "confirmed",
  "notes": "Updated delivery instructions",
  "version": 1 // Current version for optimistic locking
}
```

**Response:** (200 OK)

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "product_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "seller_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "buyer_name": "John Doe Updated",
  "buyer_phone": "+2547XXXXXXXX",
  "buyer_email": "customer@example.com",
  "buyer_address": "123 Main St, Nairobi",
  "quantity": 2,
  "total_amount": "59.98",
  "notes": "Updated delivery instructions",
  "order_source": "website",
  "status": "confirmed",
  "created_at": "2025-06-08T22:12:05",
  "updated_at": "2025-06-08T22:14:30",
  "version": 2
}
```

**Error Responses:**

- `404 Not Found`: Order not found
- `409 Conflict`: Order has been modified by another user (version mismatch)
- `422 Validation Error`: Invalid input data

### Delete Order

Soft-deletes an order by marking it as deleted without physically removing it from the database.

```
DELETE /api/v1/orders/{order_id}
```

**Path Parameters:**

- `order_id`: UUID of the order to delete

**Response:** (200 OK)

```json
{
  "message": "Order successfully deleted",
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

## Error Handling

All API endpoints follow consistent error response formats:

### Validation Errors (422)

```json
{
  "detail": [
    {
      "loc": ["body", "buyer_email"],
      "msg": "Email is required for website orders",
      "type": "value_error"
    }
  ]
}
```

### Not Found Errors (404)

```json
{
  "detail": "Order not found"
}
```

### Authentication Errors (401)

```json
{
  "detail": "Not authenticated"
}
```

### Authorization Errors (403)

```json
{
  "detail": "Not authorized to access this order"
}
```

### Conflict Errors (409)

```json
{
  "detail": "Order has been modified by another user. Please refresh and try again."
}
```

## Testing

See the comprehensive test suite in `tests/api/test_create_order.py`, `tests/api/test_whatsapp_orders.py`, `tests/api/test_order_operations.py`, and `tests/api/test_order_error_handling.py` for examples of how to interact with these endpoints.

## 🚀 Order API Modernization (2024-06)

- All order logic is now centralized in `OrderService`.
- API handlers pass DTOs/business objects directly to service methods.
- All DB access is async and uses transactional patterns.
- Optimistic locking (version checks) is enforced for all update/delete flows.
- Tenant isolation is enforced at the DB level using PostgreSQL RLS and session variables.
- No legacy/duplicate order endpoints remain; `/api/v1/orders/` is the single source of truth.
- Handlers are thin and maintain backward compatibility for clients.

## OrderChannelMeta Model & Multi-Channel Architecture

To support clean separation of channel-specific metadata and extensibility for multiple communication channels, order metadata is now stored in a dedicated OrderChannelMeta model:

### OrderChannelMeta

- Stores channel-specific metadata for an order (e.g., WhatsApp: whatsapp_number, message_id, chat_session_id)
- One-to-one relationship with the core Order model via order_id
- Includes a channel field to identify the source channel (WhatsApp, Instagram, etc.)
- Supports user_response_log field for conversational data tracking
- Ensures single responsibility and data integrity
- Enables clean extensibility for additional channels without modifying the core Order model

### Example API Response (WhatsApp Order)

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "product_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "seller_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "buyer_name": "John Doe",
  "buyer_phone": "+2547XXXXXXXX",
  "quantity": 1,
  "total_amount": "29.99",
  "order_source": "whatsapp",
  "status": "pending",
  "whatsapp_details": {
    "whatsapp_number": "+2547XXXXXXXX",
    "message_id": "wamid.abcd1234",
    "conversation_id": "conv_abcd1234"
  },
  "created_at": "2025-06-08T22:12:05",
  "updated_at": "2025-06-08T22:12:05",
  "version": 1
}
```

### Rationale & Extensibility

- **Single Responsibility:** Core order data and channel-specific metadata are separated for clarity and maintainability.
- **Extensibility:** Easy to add support for other channels (e.g., Telegram, SMS) by creating similar models and relationships.
- **Data Integrity:** Foreign key relationships ensure referential integrity and efficient queries.

For more details, see the Order and WhatsAppOrderDetails models in the backend codebase.

## Order Event System

The backend uses an event-driven architecture for order-related actions. This enables decoupled notifications, analytics, and fulfillment logic.

> **Note:** For detailed documentation on the order status lifecycle, state machine transitions, and event emission guidelines, see [Order Lifecycle & Event-Driven Architecture](order_lifecycle.md).

### Event Bus

- Located at `app/domain/events/event_bus.py`.
- Implements async publish/subscribe for domain events.
- Handlers can be registered for each event type.

### Order Event Types

- Defined in `app/domain/events/order_events.py`.
- Naming convention: `OrderActionEvent` (e.g., `OrderCreatedEvent`), with event type strings like `ORDER_CREATED`.

#### Main Events:

- **OrderCreatedEvent** (`ORDER_CREATED`):
  - `order_id`, `order_number`, `order`, `tenant_id`, `timestamp`, `event_id`, `event_metadata`
  - Emitted after a new order is created.
  - **Handlers:**
    - Sends order confirmation notification (email/SMS/WhatsApp)
    - Logs analytics event for order creation
    - Triggers fulfillment workflow (e.g., warehouse notification)
- **OrderStatusChangedEvent** (`ORDER_STATUS_CHANGED`):
  - `order_id`, `order_number`, `previous_status`, `new_status`, `changed_by`, `notes`, `tenant_id`, `timestamp`, `event_id`, `event_metadata`
  - Emitted after an order status changes.
  - **Handlers:**
    - Sends status update notification (email/SMS/WhatsApp)
    - Logs analytics event for status change
    - Handles fulfillment workflow for new status
- **OrderShippedEvent** (`ORDER_SHIPPED`):
  - `order_id`, `order_number`, `tracking_number`, `shipping_provider`, `estimated_delivery_date`, `tenant_id`, `timestamp`, `event_id`, `event_metadata`
  - Emitted when an order is shipped.
  - **Handlers:**
    - Sends shipping notification (email/SMS/WhatsApp)
    - Logs analytics event for shipping
    - Notifies warehouse/shipping provider
- **OrderDeliveredEvent** (`ORDER_DELIVERED`):
  - `order_id`, `order_number`, `delivery_date`, `received_by`, `delivery_notes`, `tenant_id`, `timestamp`, `event_id`, `event_metadata`
  - Emitted when an order is delivered.
  - **Handlers:**
    - Sends delivery notification (email/SMS/WhatsApp)
    - Logs analytics event for delivery
    - Completes fulfillment workflow
- **OrderCancelledEvent** (`ORDER_CANCELLED`):
  - `order_id`, `order_number`, `cancellation_reason`, `cancelled_by`, `refund_initiated`, `tenant_id`, `timestamp`, `event_id`, `event_metadata`
  - Emitted when an order is cancelled.
  - **Handlers:**
    - Sends cancellation notification (email/SMS/WhatsApp)
    - Logs analytics event for cancellation
    - Cancels fulfillment/refund process
- **PaymentProcessedEvent** (`PAYMENT_PROCESSED`):
  - `order_id`, `payment_id`, `amount`, `currency`, `payment_status`, `processed_by`, `timestamp`
  - Emitted after a successful payment verification or processing.
  - **Handlers:**
    - Sends payment confirmation notification (email/SMS/WhatsApp)
    - Logs analytics event for payment
    - Releases order for fulfillment

## Testing & Observability

- All event handlers are covered by a comprehensive test suite using pytest and mocks for notifications and analytics.
- Observability: all handlers log actions, and the system is ready for metrics and alerting integration (Prometheus, OpenTelemetry, etc.).
- See the test file `app/domain/events/test_order_event_handlers.py` for examples.

## 🛡️ Optimistic Locking for Data Integrity

- Optimistic locking is enforced for all order status updates and deletes to prevent lost updates and ensure data integrity.
- The API requires a `version` field in update and delete requests. If the version does not match the current version in the database, a `409 Conflict` error is returned.
- **Contributor Guidance:**
  - Always include and check the version field in update and patch operations for orders and other models that support optimistic locking.
  - Extend optimistic locking to all update/patch flows, including order changes, refund requests, and any other critical state transitions.
  - For new models or flows, add a version field and implement version checks in service methods.
- See `OrderService.update_order_status` and related methods for reference implementation.

## 🛡️ Error Response Format

All order API errors use the following format:

```json
{ "detail": "Error message here" }
```

## 🏢 Tenant Context Requirement

All order endpoints are tenant-aware and require tenant context to be set (via middleware and request headers). Requests without valid tenant context will be rejected.
