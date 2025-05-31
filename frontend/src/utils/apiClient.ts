import { useNetworkStatus } from '@/contexts/NetworkStatusContext';
import { useToast } from '@/components/ui/UseToast';

export interface ApiClientOptions {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  useOfflineCache?: boolean;
  cacheTTL?: number; // in milliseconds
}

const defaultOptions: ApiClientOptions = {
  baseUrl: '/api',
  timeout: 10000, // 10 seconds
  maxRetries: 3,
  useOfflineCache: true,
  cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
};

export class ApiClient {
  private options: ApiClientOptions;

  constructor(options: Partial<ApiClientOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Makes an API request with built-in retry, timeout, and offline caching mechanisms
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string
  ): Promise<T> {
    const { baseUrl, timeout, maxRetries, useOfflineCache, cacheTTL } = this.options;
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    // Check network status
    if (!navigator.onLine && useOfflineCache && cacheKey) {
      const cachedData = this.getFromCache<T>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // Implement retries with exponential backoff
    let retries = 0;
    
    while (true) {
      try {
        // Add timeout using AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const requestOptions: RequestInit = {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        };
        
        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Cache the successful response if caching is enabled
        if (useOfflineCache && cacheKey) {
          this.saveToCache(cacheKey, data, cacheTTL);
        }
        
        return data as T;
      } catch (error: any) {
        retries++;
        
        // If we've reached max retries, throw the error
        if (retries >= (maxRetries || 3)) {
          throw error;
        }
        
        // If the error is a timeout or network error, wait and retry
        if (
          error.name === 'AbortError' || 
          error.message.includes('NetworkError') ||
          error.message.includes('Failed to fetch')
        ) {
          // Exponential backoff: wait 2^retries * 1000ms before retrying
          const backoffTime = Math.pow(2, retries) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        }
        
        // For other errors, just throw
        throw error;
      }
    }
  }

  /**
   * Save data to localStorage cache with TTL
   */
  private saveToCache<T>(key: string, data: T, ttl: number = this.options.cacheTTL || 0): void {
    try {
      const cacheItem = {
        data,
        expiry: Date.now() + ttl,
      };
      localStorage.setItem(`api_cache_${key}`, JSON.stringify(cacheItem));
    } catch (error) {
      console.warn('Failed to cache API response:', error);
    }
  }

  /**
   * Get data from localStorage cache if it exists and is not expired
   */
  private getFromCache<T>(key: string): T | null {
    try {
      const cachedItem = localStorage.getItem(`api_cache_${key}`);
      
      if (!cachedItem) return null;
      
      const { data, expiry } = JSON.parse(cachedItem);
      
      // Check if cache has expired
      if (Date.now() > expiry) {
        localStorage.removeItem(`api_cache_${key}`);
        return null;
      }
      
      return data as T;
    } catch (error) {
      console.warn('Failed to retrieve cached API response:', error);
      return null;
    }
  }
}

/**
 * React hook for using the API client with built-in toast notifications
 * and network status monitoring
 */
export function useApi(options: Partial<ApiClientOptions> = {}) {
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const apiClient = new ApiClient(options);
  
  const request = async <T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string
  ): Promise<T | null> => {
    try {
      // Show a warning toast if offline but attempting to make a request
      if (!isOnline && (!options.method || options.method === 'GET')) {
        toast({
          title: 'You are offline',
          description: 'Using cached data. Some information may be outdated.',
          variant: 'default',
        });
      } else if (!isOnline) {
        toast({
          title: 'Cannot perform this action',
          description: 'You are currently offline. Please try again when you have a network connection.',
          variant: 'destructive',
        });
        return null;
      }
      
      return await apiClient.request<T>(endpoint, options, cacheKey);
    } catch (error: any) {
      console.error('API request failed:', error);
      
      toast({
        title: 'Request failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
      
      return null;
    }
  };
  
  return { request };
}

export default ApiClient;
