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
