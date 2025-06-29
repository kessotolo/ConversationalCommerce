# ConversationalCommerce Architecture Documentation

Welcome to the ConversationalCommerce architecture documentation. This directory contains detailed information about the system architecture, design principles, and implementation patterns.

## Documentation Structure

- [**Overview**](overview.md) - High-level architecture and system design
- [**Backend**](backend.md) - Backend architecture, services, and patterns
- [**Frontend**](frontend.md) - Frontend architecture, modules, and components
- [**Database**](../DB_SCHEMA.md) - Database schema and relationships
- [**Directory Structure**](../DIRECTORY_STRUCTURE.md) - Codebase organization
- [**Module Dependencies**](module-dependencies.md) - Module boundaries and allowed imports
- [**Phase 2 Features**](phase2-features.md) - Completed Phase 2 features and implementations

## Key Architectural Principles

1. **Modular Monolith** - Clear module boundaries in a single deployable unit
2. **Async Everything** - All database and I/O operations are asynchronous
3. **Service Layer Pattern** - Business logic in service classes, thin controllers
4. **Multi-tenant Security** - Row-Level Security for tenant isolation
5. **Mobile-First, Chat-Native** - UI optimized for mobile and messaging platforms
6. **TypeScript Strict Mode** - Full type safety throughout frontend code
7. **Direct Module Imports** - No bridge files, clear dependency graph

## Architecture Decision Records (ADRs)

See the [decisions](decisions/) directory for formal architecture decision records.

- [ADR-0001: Direct Module Imports](decisions/0001-direct-module-imports.md)
