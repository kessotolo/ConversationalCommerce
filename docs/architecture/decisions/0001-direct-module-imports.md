# ADR-0001: Direct Module Imports vs Bridge Files

## Status

Accepted

## Context

In the early development of the ConversationalCommerce platform, we initially centralized types in `/types/` directory files like `storefrontEditor.ts`, `Monitoring.ts`, `Theme.ts`, and `Violation.ts`. As the codebase evolved into a modular monolith architecture, we created proper domain models in module directories (`@core/models/base`, `@storefront/models/*`, etc.), but kept the original type files as bridges for backward compatibility.

This approach created several issues:

- Technical debt through indirection
- Increased maintenance burden with duplicate type definitions
- Import confusion for developers
- Difficulty in enforcing module boundaries
- Potential for type inconsistencies between bridge files and actual module types

## Decision

We have decided to:

1. Remove all bridge files in favor of direct module imports
2. Enforce direct module imports through ESLint rules
3. Use `import type` syntax for type-only imports
4. Structure our imports according to our modular monolith architecture

Example of the preferred approach:

```typescript
// PREFERRED: Direct module imports
import type { UUID, Entity } from '@core/models/base';
import { Status } from '@core/models/base';
import type { Banner } from '@storefront/models/banner';
```

Instead of:

```typescript
// AVOID: Bridge file imports
import { UUID, Status as DraftStatus } from '../types/storefrontEditor';
```

## Consequences

### Positive

- Cleaner and more maintainable codebase
- Clear module boundaries and dependencies
- Improved type safety and consistency
- Better IDE support with direct imports
- Easier to understand code organization for new developers
- Support for tree-shaking in type imports
- **Ongoing CI Enforcement**: Lint and type checks are run in CI/CD and block merges on violations.

### Negative

- Required significant refactoring effort
- Potential for breaking changes during migration
- Need for additional ESLint rules to enforce patterns

## Implementation

1. Created a migration script to identify and replace bridge imports
2. Added ESLint rules to prevent imports from bridge files
3. Fixed TypeScript errors resulting from the migration
4. Added architecture documentation
5. Removed bridge files once all imports were migrated
6. **Strictly enforce these rules in CI/CD and documentation.**

## Follow-up Actions

1. Enhance ESLint rules to enforce module boundaries (**Complete**)
2. Add automated tests to verify architectural compliance (**Ongoing in CI**)
3. Update developer documentation and onboarding materials (**Complete**)
4. Monitor for any accidental recreation of bridge patterns (**Ongoing**)
5. **Regularly clean up backup/test files and enforce no `.bak`/bridge files in the codebase.**

## 2024-06 Update: Order API & Service Refactor

- All order business logic is now in the service layer (`order_service.py`), with DRY error handling and transaction management.
- This refactor further reduces direct module imports and centralizes business logic, error handling, and transaction boundaries.
