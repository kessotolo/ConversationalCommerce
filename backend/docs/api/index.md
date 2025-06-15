# API Documentation

Welcome to the Conversational Commerce Platform API documentation. This guide provides comprehensive information on available endpoints, request/response formats, and best practices for integrating with our API.

## Contents

### Core Documentation

- [API Versioning Strategy](./api_versioning.md) - Guidelines on API versioning, when to create new versions, and migration procedures
- [Order API Reference](./orders.md) - Order management endpoints and usage examples
- [Order Lifecycle](./order_lifecycle.md) - Event-driven order status transitions and lifecycle details

### Additional Resources

- [Backend README](/README.md) - Overview of the backend architecture and setup
- [Contributing Guidelines](/CONTRIBUTING.md) - Best practices for contributing to the codebase

## API Versioning

The platform uses path-based versioning with two active versions:

- **[v1 API](/app/api/v1/)** - Stable, backward compatible API
- **[v2 API](/app/api/v2/)** - Enhanced API with new features and breaking changes

For details on when to use each version and migration guidelines, see our [API Versioning Strategy](./api_versioning.md) documentation.

## Authentication

All API endpoints require authentication. See the specific endpoint documentation for authentication requirements.

## Error Handling

All API errors follow a standardized format:

```json
{
  "detail": "Error message here"
}
```

## Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

For endpoint-specific error codes, see the relevant documentation.
