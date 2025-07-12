/**
 * Standardized error types for API responses and validation
 * This helps maintain consistency across the codebase
 */

import { ApiError } from '@/lib/api-types';

/**
 * Standard API response error structure (compatible with ApiError)
 */
export interface ApiResponseError extends ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

/**
 * Validation specific error details
 * Extends Record<string, unknown> for type compatibility
 */
export interface ValidationErrorDetails extends Record<string, unknown> {
  errors: Array<{
    field: string;
    message: string;
    index?: number;
  }>;
}

/**
 * Enhanced API error with validation details
 * Compatible with ApiError interface
 */
export interface ValidationApiError extends ApiError {
  code: string;
  message: string;
  details: ValidationErrorDetails;
}

/**
 * Utility function to create a standard API error
 */
export function createApiError(
  message: string,
  code: string,
  details?: Record<string, unknown>
): ApiResponseError {
  return {
    message,
    code,
    ...(details ? { details } : {}),
  };
}

/**
 * Utility function to create a validation error
 */
export function createValidationError(
  message: string,
  validationErrors: ValidationErrorDetails['errors']
): ValidationApiError {
  return {
    message,
    code: 'VALIDATION_ERROR',
    details: {
      errors: validationErrors,
    },
  };
}
