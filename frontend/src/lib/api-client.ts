/**
 * Centralized API client with consistent typing and error handling
 * Designed to work with the fetchWithRetry utility for offline resilience
 */

import type { ApiResponse } from './api-types';
import { createApiError, ApiResponseError } from './error-types';
import { fetchWithRetry, FetchWithRetryOptions } from '@/modules/core/utils/network';

export interface ApiClientOptions {
  /**
   * Base URL for API requests
   * If not provided, requests will be made relative to the current origin
   */
  baseUrl?: string;
  
  /**
   * Default headers to include with every request
   */
  defaultHeaders?: HeadersInit;
  
  /**
   * Default retry options for fetchWithRetry
   */
  retryOptions?: FetchWithRetryOptions;
}

/**
 * Type-safe API client for making HTTP requests
 */
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;
  private retryOptions: FetchWithRetryOptions;
  
  constructor(options?: ApiClientOptions) {
    this.baseUrl = options?.baseUrl || '';
    this.defaultHeaders = options?.defaultHeaders || {
      'Content-Type': 'application/json',
    };
    this.retryOptions = options?.retryOptions || {
      retries: 3,
      retryDelay: 1000,
    };
  }
  
  /**
   * Make a GET request
   * @param url - Endpoint URL (will be appended to baseUrl)
   * @param headers - Optional additional headers
   * @returns Promise with typed response data
   */
  async get<T>(url: string, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, headers);
  }
  
  /**
   * Make a POST request
   * @param url - Endpoint URL (will be appended to baseUrl)
   * @param data - Request body data
   * @param headers - Optional additional headers
   * @returns Promise with typed response data
   */
  async post<T, D = any>(url: string, data?: D, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, headers);
  }
  
  /**
   * Make a PUT request
   * @param url - Endpoint URL (will be appended to baseUrl)
   * @param data - Request body data
   * @param headers - Optional additional headers
   * @returns Promise with typed response data
   */
  async put<T, D = any>(url: string, data?: D, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, headers);
  }
  
  /**
   * Make a DELETE request
   * @param url - Endpoint URL (will be appended to baseUrl)
   * @param headers - Optional additional headers
   * @returns Promise with typed response data
   */
  async delete<T>(url: string, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, headers);
  }
  
  /**
   * Make a PATCH request
   * @param url - Endpoint URL (will be appended to baseUrl)
   * @param data - Request body data
   * @param headers - Optional additional headers
   * @returns Promise with typed response data
   */
  async patch<T, D = any>(url: string, data?: D, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, data, headers);
  }
  
  /**
   * Make an HTTP request with retry capability and typed response
   * @param method - HTTP method
   * @param url - Endpoint URL (will be appended to baseUrl)
   * @param data - Optional request body
   * @param headers - Optional additional headers
   * @returns Promise with typed response data
   */
  private async request<T>(
    method: string,
    url: string,
    data?: any,
    headers?: HeadersInit
  ): Promise<ApiResponse<T>> {
    const requestUrl = `${this.baseUrl}${url}`;
    
    try {
      const response = await fetchWithRetry(
        requestUrl,
        {
          method,
          headers: {
            ...this.defaultHeaders,
            ...headers,
          },
          ...(data ? { body: JSON.stringify(data) } : {}),
        },
        this.retryOptions
      );
      
      if (!response.ok) {
        // Extract error details
        const errorResponse = await response.json().catch(() => ({}));
        const errorMessage = 
          errorResponse.message || 
          errorResponse.error || 
          `Request failed with status ${response.status}`;
        const errorCode = 
          errorResponse.code || 
          response.status.toString();
        
        return {
          success: false,
          error: createApiError(errorMessage, errorCode, errorResponse.details)
        };
      }
      
      // Parse and return successful response
      const responseData = await response.json();
      
      // Check if the API returns a nested success/data structure or just raw data
      if (responseData && typeof responseData === 'object' && 'success' in responseData) {
        // API returns a structured response
        if (responseData.success) {
          return {
            success: true,
            data: responseData.data as T
          };
        } else {
          return {
            success: false,
            error: responseData.error as ApiResponseError
          };
        }
      } else {
        // API returns raw data
        return {
          success: true,
          data: responseData as T
        };
      }
    } catch (err) {
      const error = err as Error;
      return {
        success: false,
        error: createApiError(
          error.message || 'An unexpected error occurred',
          'NETWORK_ERROR'
        )
      };
    }
  }

  /**
   * Set an authorization token to be included with all requests
   * @param token - The authorization token
   * @param scheme - Auth scheme (default: 'Bearer')
   * @returns Updated ApiClient instance for method chaining
   */
  setAuthToken(token: string, scheme: string = 'Bearer'): ApiClient {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      'Authorization': `${scheme} ${token}`
    };
    return this;
  }

  /**
   * Create a new instance of ApiClient with the same configuration
   * @returns New ApiClient instance
   */
  clone(): ApiClient {
    return new ApiClient({
      baseUrl: this.baseUrl,
      defaultHeaders: { ...this.defaultHeaders },
      retryOptions: { ...this.retryOptions }
    });
  }
}

/**
 * Create a new API client with optional configuration
 * @param options - Client configuration
 * @returns Configured ApiClient instance
 */
export function createApiClient(options?: ApiClientOptions): ApiClient {
  return new ApiClient(options);
}
