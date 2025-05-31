/**
 * Core Domain Models
 * 
 * These are the foundational types for our Conversational Commerce platform.
 * All other domain models should extend these base types for consistency.
 */

/**
 * UUID type
 * Ensures consistent handling of UUIDs across the application
 */
export type UUID = string;

/**
 * Base entity interface
 * All domain entities should extend this interface
 */
export interface Entity {
  id: UUID;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Base model for tenant-scoped entities
 * For entities that belong to a specific tenant
 */
export interface TenantScoped extends Entity {
  tenantId: UUID;
}

/**
 * Money type for currency handling
 * Used for prices, amounts, etc.
 */
export interface Money {
  amount: number;
  currency: string;
}

/**
 * Result type for async operations
 * Standardizes error handling across the application
 */
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Pagination parameters
 * Used for list requests
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

/**
 * Paginated result
 * Standard response format for paginated data
 */
export interface PaginatedResult<T> {
  items: T[];
  totalCount?: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Geographic region
 * Used for region-specific functionality
 */
export enum Region {
  AFRICA = 'africa',
  NORTH_AMERICA = 'north_america',
  SOUTH_AMERICA = 'south_america',
  EUROPE = 'europe',
  ASIA = 'asia',
  AUSTRALIA = 'australia'
}

/**
 * Messaging channel type
 * Supported messaging platforms
 */
export enum ChannelType {
  WHATSAPP = 'whatsapp',
  MESSENGER = 'messenger',
  INSTAGRAM = 'instagram',
  TELEGRAM = 'telegram',
  LINE = 'line',
  WECHAT = 'wechat',
  SMS = 'sms'
}

/**
 * Network connection quality
 * Used for adaptive UI/UX based on connection quality
 */
export enum ConnectionQuality {
  OFFLINE = 'offline',
  POOR = 'poor',
  FAIR = 'fair',
  GOOD = 'good',
  EXCELLENT = 'excellent'
}
