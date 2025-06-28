/**
 * Core pagination models
 * Contains types for pagination results used across all modules
 */

/**
 * Generic paginated result interface used for all paginated API responses
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  };
  links?: {
    first?: string;
    last?: string;
    prev?: string | null;
    next?: string | null;
  };
}
