# Contributing to ConversationalCommerce

## 🚩 Comprehensive List of Missing or Problematic Imports

Based on recent codebase scans, please review and address the following import issues before submitting a PR:

### 1. Icon/Component Import Issues
| File | Issue | Recommended Fix |
|------|-------|-----------------|
| /src/components/layout/DashboardLayout.tsx | Relative imports for MobileNav and Sidebar | Use absolute imports with @/components/ prefix |
| /src/components/StorefrontEditor/Permissions/AddUserPermission.tsx | Unused imports: Dialog, UserPlusIcon | Remove unused icons/components |
| /src/components/dashboard/StorefrontLinks.tsx | Using HTML <a> instead of Next.js <Link> | Replace with Next.js Link component |
| /src/components/products/ShareButtons.tsx | Unused Copy icon import | Remove if not needed |

### 2. Auth-Related Import Issues
| File | Issue | Recommended Fix |
|------|-------|-----------------|
| /src/lib/auth/getToken.ts | Using React hook in non-React function | Refactor to proper Hook pattern or custom utility |
| /src/contexts/AuthContext.tsx | Unused variable: password | Remove unused variable |
| /src/utils/auth-utils.tsx | Unused variable: user and missing hook dependency | Fix hook dependencies and remove unused var |

### 3. Module-Related Import Issues
| File | Issue | Recommended Fix |
|------|-------|-----------------|
| /src/lib/api.ts | Restricted import pattern: ./api/types | Use module public API |
| /src/lib/api/storefrontEditor.ts | Restricted import: ./storefrontEditor.types | Use proper module import |
| /src/modules/cart/test-cart.ts | Restricted import: ./services | Use module public API |
| /src/modules/cart/services/useCartStore.ts | Restricted import: ./CartService | Use module public API |

### 4. Module Index Files (Allowed by ESLint Exceptions)
These files have imports that appear to violate the pattern, but are explicitly allowed by your ESLint configuration:

/src/modules/storefront/index.ts
/src/modules/storefront/models/index.ts
/src/modules/core/index.ts
/src/modules/theme/models/index.ts
/src/modules/theme/index.ts
/src/modules/cart/models/index.ts
/src/modules/cart/index.ts
/src/modules/cart/services/index.ts
/src/modules/monitoring/models/index.ts
/src/modules/monitoring/index.ts

### 5. Image Optimization Issues
| File | Issue | Recommended Fix |
|------|-------|-----------------|
| /src/components/products/ProductCard.tsx | Using HTML <img> tag | Replace with Next.js <Image> component |
| /src/components/products/ShareButtons.tsx | Using HTML <img> tag | Replace with Next.js <Image> component |

### 6. Unused Variables/Imports Across Components
Several components have unused variables and imports that should be cleaned up. Key examples include:
- ActivityDashboard.tsx: unused filter, setFilter, sendMessage
- RulesManager.tsx: unused RuleCondition
- DraftManagement.tsx: unused Status, DraftsResponse
- VersionHistory.tsx: unused compareVersions

### 7. React Hook Dependency Issues
Multiple components have React hook dependency issues that need addressing:
- Permissions.tsx: Missing loadPermissions dependency
- VersionHistory.tsx: Missing loadVersions dependency
- RulesManager.tsx: Missing fetchRules dependency
- auth-utils.tsx: Missing redirectToLogin dependency

---

## Summary of Import Violations Pattern

The primary pattern violations are:
- Using relative imports (./ or ../) instead of absolute imports with the @/ alias
- Importing directly from internal module files instead of their public APIs
- Using types from legacy bridge files that should now come from module public APIs

Please review and resolve these issues before submitting your contribution. This ensures architectural consistency and code quality across the project.