/**
 * Common API response types used across the application
 * Following common REST API patterns for consistent error handling
 */

/**
 * Standard error response structure
 */
export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

/**
 * Generic API response wrapper
 * All API responses should follow this pattern for consistent handling
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  page?: number;
  pages?: number;
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}
