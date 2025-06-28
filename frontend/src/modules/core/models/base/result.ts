/**
 * Generic result type for domain operations
 * Provides a standardized way to handle success/failure
 */
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

/**
 * Create a successful result
 */
export function success<T>(data: T): Result<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Create a failed result
 */
export function failure<E extends Error>(error: E): Result<never, E> {
  return {
    success: false,
    error,
  };
}

/**
 * Check if a result is successful
 */
export function isSuccess<T, E>(
  result: Result<T, E>,
): result is Result<T, E> & { success: true; data: T } {
  return result.success === true;
}

/**
 * Check if a result is a failure
 */
export function isFailure<T, E>(
  result: Result<T, E>,
): result is Result<T, E> & { success: false; error: E } {
  return result.success === false;
}
