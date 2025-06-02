# Batch Fix Implementation Order

Based on your modular monolith architecture and the technical debt analysis, here's the recommended order for fixing the remaining issues:

## 1. Core Module Imports (Highest Priority)

Files requiring immediate attention:
- StorefrontEditor components importing directly from `@/modules/core/types` or `@/modules/core/models/base`
- ThemeContext.tsx importing directly from `theme/types`
- Monitoring components importing directly from `monitoring/types`

## 2. Unused Variables in Key Components

High priority files with unused imports:
- CreateBannerModal.tsx
- BannerLogoManagement components
- Monitoring components
- Theme components

## 3. Module Boundary Enforcement

Update remaining module public APIs:
- Storefront module
- Theme module
- Monitoring module

## 4. Test and Legacy File Handling

- Exclude test files from strict linting where appropriate
- Clean up remaining bridge patterns in test files
- Verify architecture boundaries with ESLint

## Implementation Notes

1. When fixing imports, always update to use the module's public API:
   ```typescript
   // AVOID: Direct internal imports
   import { Type } from '@/modules/core/models/base';
   
   // USE: Public API imports
   import { Type } from '@/modules/core';
   ```

2. For files with unused variables, use one of these approaches:
   - Remove the unused import/variable
   - Prefix with underscore (_unusedVar)
   - Add ESLint disable comment for intentional cases
