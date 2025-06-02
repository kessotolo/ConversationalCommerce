/**
 * Core Module Public API
 *
 * This is the public entry point for the core module. All imports from this module
 * should be made through this file to maintain architectural boundaries.
 *
 * Based on the modular monolith architecture, this exports all foundational types
 * that other modules extend.
 */

// Core module's index.ts is allowed to import from its own internal files
// eslint-disable-next-line no-restricted-imports
export * from './types';

// Base model types - foundation for domain entities
// eslint-disable-next-line no-restricted-imports
export type {
  UUID,
  Entity,
  TenantScoped,
  Result,
  Money,
  Draftable,
  ApplicationError,
  AuditInfo,
  FilterOption,
  FilterGroup,
  Address,
  BaseDetails,
  BaseModel,
} from './models/base';

// Export enums and constants
// eslint-disable-next-line no-restricted-imports
export { Status } from './models/base';

// Pagination types for data fetching
// eslint-disable-next-line no-restricted-imports
export type { PaginatedResult, PaginationParams } from './models/base';
