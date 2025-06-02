/**
 * Core Module Public API
 * 
 * This is the public entry point for the core module. All imports from this module
 * should be made through this file to maintain architectural boundaries.
 * 
 * Based on the modular monolith architecture, this exports all foundational types
 * that other modules extend.
 */

// Export all types from the types file
export * from './types';

// Base model types - foundation for domain entities
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
  BaseModel
} from './models/base';

// Export enums and constants
export { Status } from './models/base';

// Pagination types for data fetching
export type { 
  PaginatedResult,
  PaginationParams
} from './models/base';
