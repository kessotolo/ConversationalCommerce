/**
 * Core Service Interfaces
 * 
 * This file defines the base service interfaces used throughout the application.
 * These provide a consistent pattern for data access and business logic.
 */

import { Entity, PaginatedResult, PaginationParams, Result, UUID } from '../models/base';

/**
 * Generic Repository Interface
 * Defines standard CRUD operations for any entity
 */
export interface IRepository<T extends Entity> {
  findById(id: UUID): Promise<Result<T>>;
  findAll(params?: PaginationParams): Promise<Result<PaginatedResult<T>>>;
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<T>>;
  update(id: UUID, entity: Partial<T>): Promise<Result<T>>;
  delete(id: UUID): Promise<Result<boolean>>;
}

/**
 * Generic Service Interface
 * Defines standard business logic operations for any entity
 */
export interface IService<T extends Entity> {
  findById(id: UUID): Promise<Result<T>>;
  findAll(params?: PaginationParams): Promise<Result<PaginatedResult<T>>>;
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<T>>;
  update(id: UUID, entity: Partial<T>): Promise<Result<T>>;
  delete(id: UUID): Promise<Result<boolean>>;
}

/**
 * Query Options
 * Common options used for querying data
 */
export interface QueryOptions {
  includes?: string[];
  select?: string[];
  filter?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
}

/**
 * Cache Interface
 * Defines operations for caching data
 */
export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Event Interface
 * Defines operations for publishing and subscribing to events
 */
export interface IEventBus {
  publish<T>(eventName: string, data: T): Promise<void>;
  subscribe<T>(eventName: string, handler: (data: T) => void): () => void;
}

/**
 * Logger Interface
 * Defines operations for logging
 */
export interface ILogger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
}

/**
 * Feature Flag Interface
 * Defines operations for feature flags
 */
export interface IFeatureFlag {
  isEnabled(feature: string, context?: Record<string, any>): Promise<boolean>;
}

/**
 * Tenant Context Interface
 * Provides access to the current tenant context
 */
export interface ITenantContext {
  getCurrentTenantId(): UUID | null;
  setCurrentTenantId(tenantId: UUID): void;
  clearCurrentTenantId(): void;
}
