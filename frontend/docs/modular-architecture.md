# Modular Monolith Architecture

## Overview

The Conversational Commerce platform uses a modular monolith architecture, inspired by Shopify's approach. This architecture provides clear boundaries between different parts of the system while maintaining the simplicity of a single deployment unit.

## Module Structure

Each module follows this structure:

```
/modules
  /<module-name>
    /models      # Data models and interfaces
    /services    # Business logic
    /components  # UI components
    /hooks       # React hooks
    /utils       # Module-specific utilities
```

## Modules

### Core Module

The Core module contains foundational elements used across the platform:
- Base types (UUID, Entity, etc.)
- Shared utilities
- Cross-cutting concerns

### Tenant Module

The Tenant module handles multi-tenant functionality:
- Tenant registration and management
- Tenant-specific settings
- Tenant isolation

### Storefront Module

The Storefront module manages merchant storefronts:
- Storefront themes and customization
- Storefront navigation
- Storefront pages

### Conversation Module

The Conversation module handles messaging functionality:
- WhatsApp integration
- Message templating
- Conversation flows
- Message history

### Product Module

The Product module manages product catalogs:
- Product information
- Categories and collections
- Inventory management
- Media management

### Order Module

The Order module handles order processing:
- Order creation and management
- Fulfillment tracking
- Order history

### Payment Module

The Payment module manages payment processing:
- Payment method integration
- Transaction handling
- Payment status tracking

### Security Module

The Security module handles security concerns:
- Authentication
- Authorization
- Audit logging
- Content moderation

## Module Interaction Rules

Modules can only depend on:
1. The Core module
2. Themselves
3. Explicitly allowed dependencies

This ensures clean separation of concerns and prevents circular dependencies.

## Development Guidelines

When working with this architecture:

1. Place new code in the appropriate module
2. Follow the dependency rules
3. Export only what's necessary through the module's public API
4. Use interfaces to define contracts between modules
