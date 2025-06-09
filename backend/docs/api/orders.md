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
  "buyer_email": "customer@example.com",  // Required for website orders
  "buyer_address": "123 Main St, Nairobi",
  "quantity": 2,
  "total_amount": 59.98,
  "notes": "Please deliver before 5pm",
  "order_source": "website"  // "website" or "instagram"
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
  "whatsapp_number": "+2547XXXXXXXX",
  "message_id": "wamid.abcd1234",
  "conversation_id": "conv_abcd1234"
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
    },
    // Additional orders...
  ]
}
```

### Get WhatsApp Orders by Number

Retrieves orders associated with a specific WhatsApp number.

```
GET /api/v1/orders/whatsapp/{whatsapp_number}
```

**Path Parameters:**

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
      "whatsapp_details": {
        "whatsapp_number": "+2547XXXXXXXX",
        "message_id": "wamid.abcd1234",
        "conversation_id": "conv_abcd1234"
      },
      "created_at": "2025-06-08T22:12:05",
      "updated_at": "2025-06-08T22:12:05"
    },
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
  "version": 1  // Current version for optimistic locking
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

## 🛠️ Order API & Service Refactor (2024-06)

- All business logic and validation for order operations is now centralized in the service layer (`order_service.py`).
- API endpoints are thin and focused on HTTP concerns, delegating all business logic to the service.
- A DRY error handler decorator is used on all order endpoints to map custom service exceptions to standardized HTTP responses.
- Transaction boundaries are managed by a `@transactional` decorator in the service layer, ensuring atomicity and rollback on error.
- A custom exception hierarchy (`OrderError`, `OrderNotFoundError`, `OrderValidationError`) is used for robust, expressive error handling in the service layer.
- Error-to-HTTP mapping is now centralized and consistent, improving maintainability and client experience.
- All tests and documentation have been updated to reflect these changes, and the codebase is now easier to extend and maintain for future contributors.

## WhatsAppOrderDetails Model & Order Structure Refactor

To support clean separation of conversational metadata and extensibility for future channels, WhatsApp-specific order details are now stored in a dedicated model:

### WhatsAppOrderDetails
- Stores WhatsApp/conversational metadata for an order (whatsapp_number, message_id, conversation_id)
- One-to-one relationship with the core Order model via order_id
- Ensures single responsibility and data integrity

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
