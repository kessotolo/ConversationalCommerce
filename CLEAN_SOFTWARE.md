# Clean Software Tracker

This document tracks the remaining technical debt, migration tasks, and cleanup issues identified in the codebase. The goal is to resolve all of these before the software is considered fully built and production-ready.

---

## Project Coding Principles

This project adheres to specific coding principles that guide our development:

- **Progressive Technical Debt Resolution:** We track non-blocking issues in this document and address them after the core software is built and functional.
- **Prioritization of Functional Delivery:** Focus on delivering working features first, with cleanup tasks scheduled for later iterations.
- **Consistent Documentation:** All technical debt must be documented here with clear descriptions and recommended actions.
- **Regular Review:** Codebase reviews are conducted periodically to identify new issues and track progress on existing ones.

---

## Outstanding Issues to Clean Up

### 1. Import Structure Issues
- **Description:** Some components use relative imports (`./ or ../`) instead of absolute imports with `@/` prefix as required by the project standards.
- **Action:** Refactor affected files to use consistent absolute import patterns.
- **Files Identified:** 
  - Several module files in `src/modules/` (complete audit needed)

### 2. React Hook Dependencies
- **Description:** Some components (especially in monitoring) have React hook dependency arrays that need manual review for correctness.
- **Action:** Audit and fix all hook dependencies to ensure stable and predictable behavior.
- **Files Identified:**
  - `Permissions.tsx`: Missing loadPermissions dependency
  - `VersionHistory.tsx`: Missing loadVersions dependency
  - `RulesManager.tsx`: Missing fetchRules dependency
  - `auth-utils.tsx`: Missing redirectToLogin dependency

### 3. Next.js Component Usage
- **Description:** Some components still use HTML tags instead of Next.js optimized components:
  - HTML `<img>` tags instead of Next.js `<Image>` component
  - HTML `<a>` tags instead of Next.js `<Link>` component
- **Action:** Complete migration to Next.js components for all applicable cases.
- **Files Identified:**
  - `StorefrontLinks.tsx`: Uses `<a>` tags instead of Next.js `<Link>` components (lines 46, 61, 72, 87, 97, 106, 124, 140, 150, 164)
  - `ProductCard.tsx`: Uses HTML `<img>` tag (line 77) instead of Next.js `<Image>` component
  - `ShareButtons.tsx`: Uses HTML `<img>` tag (line 347) instead of Next.js `<Image>` component

### 4. Unused Imports and Variables
- **Description:** Several components have unused variables and imports that should be cleaned up.
- **Action:** Remove all unused imports and variables.
- **Files Identified:**
  - `ActivityDashboard.tsx`: Unused filter, setFilter, sendMessage
  - `RulesManager.tsx`: Unused RuleCondition
  - `DraftManagement.tsx`: Unused Status, DraftsResponse
  - `VersionHistory.tsx`: Unused compareVersions

### 5. Scripts and API Routes
- **Description:** `any` types and relaxed lint rules are currently allowed in scripts and API route files for flexibility.
- **Action:** Review and refactor scripts and API routes to use strict typing and adhere to main codebase standards.

### 6. StorefrontEditor TypeScript Refinement
- **Description:** Some StorefrontEditor components need improved type definitions and stricter type safety.
- **Action:** Refactor these components to use explicit, robust TypeScript types.

### 7. Unused Variables in API Bridge Files
- **Description:** Some unused type exports remain in bridge files as transitional technical debt.
- **Action:** Remove or relocate unused types as soon as all references are updated.

### 8. Legacy JSX Files
- **Description:** A few legacy JSX files remain and are pending migration to TypeScript.
- **Action:** Convert all JSX files to `.tsx` and ensure type safety.

### 9. ESLint Overrides and Technical Debt
- **Description:** Some issues are currently handled via ESLint configuration overrides (e.g., unused variables, relaxed rules in scripts).
- **Action:** Remove overrides and enforce strict linting once codebase is fully migrated.

### 10. Mixed Styling Approaches
- **Description:** The codebase uses a mix of styling approaches (TailwindCSS and MUI components).
- **Action:** Standardize on a consistent styling approach or document clear boundaries for when each should be used.
- **Files Identified:**
  - `ShareButtons.tsx`: Uses MUI components while other files use TailwindCSS

---

## Codebase Review Process

1. **Regular Reviews:** Conduct codebase reviews periodically to identify issues.
2. **Documentation:** Document all findings in this file with specific file references where possible.
3. **Prioritization:** Categorize issues as "blocking" or "non-blocking" for software completion.
4. **Resolution Planning:** Set target dates for addressing non-blocking issues after core functionality is complete.

## How to Use This Document
- **Update this file** whenever new technical debt is discovered or resolved.
- **Assign owners** and deadlines to each item as the project nears completion.
- **Review and check off** each item before the final production release.
- **Track progress** by updating the status of each item as work progresses.

---

_Last updated: June 12, 2025 - Comprehensive codebase review completed_