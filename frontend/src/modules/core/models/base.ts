/**
 * Core Domain Models
 *
 * This file contains foundational types that all other modules extend.
 * Always import core types from this file to maintain consistency across the application.
 */

// Basic Types
export type UUID = string; // UUID represented as string but validated as UUID on backend

// Base Entity Type
export interface Entity {
  id: UUID;
  created_at: string;
  updated_at?: string;
}

// Multi-Tenant Types
export interface TenantScoped extends Entity {
  tenant_id: UUID;
}

// Result Pattern for Error Handling
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

// Money Type for Currency Operations
export interface Money {
  amount: number;
  currency: string;
}

// Pagination Types
export interface PaginationParams {
  skip?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

// Common Status Types
export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted',
  PENDING = 'pending',
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  SCHEDULED = 'scheduled',
}

// Common Error Types
export interface ApplicationError extends Error {
  code: string;
  statusCode?: number;
  /**
   * Additional error details. Use unknown for dynamic data.
   */
  details?: Record<string, unknown>;
}

// Audit Information
export interface AuditInfo {
  created_by: UUID;
  created_at: string;
  updated_by?: UUID;
  updated_at?: string;
}

// Draft Pattern
export interface Draftable extends Entity, AuditInfo {
  status: Status;
  published_at?: string;
  published_by?: UUID;
}

// Filter Types
export interface FilterOption<T = unknown> {
  id: string;
  label: string;
  value: T;
}

export interface FilterGroup<T = unknown> {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'range' | 'boolean';
  options?: FilterOption<T>[];
  defaultValue?: T;
}

// Address Type
export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
  type?: 'billing' | 'shipping' | 'both';
}

// Define a type for details if possible, otherwise use unknown
export interface BaseDetails {
  // Add known fields here, or use unknown if truly dynamic
  [key: string]: unknown;
}

// Replace 'value: any' and 'defaultValue?: any' with generics
export interface BaseModel<T = unknown> {
  value: T;
  defaultValue?: T;
  details?: BaseDetails;
}
