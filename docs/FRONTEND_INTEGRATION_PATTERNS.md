# Frontend Integration Patterns for Track B

## Overview

This document provides comprehensive integration patterns and coordination mechanisms for Track B (Frontend) to seamlessly work with Track A's (Backend) RLS implementation, merchant authentication, and tenant isolation systems.

## Phase 2 Track A & B Coordination

### Backend Services Integration

Track A has implemented:
- ✅ Comprehensive testing coverage with security validation
- ✅ Performance optimization with multi-level caching
- ✅ RLS migration scripts and legacy data upgrade paths
- ✅ Error recovery with retry mechanisms and circuit breakers

Track B needs to integrate with these systems using the patterns below.

---

## 1. Tenant Context Management

### Frontend Tenant Context Provider

```typescript
// frontend/src/contexts/TenantContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { tenantService } from '@/services/tenantService';

interface TenantContextType {
  tenantId: string | null;
  merchantId: string | null;
  tenantData: Tenant | null;
  isLoading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
  setTenantContext: (tenantId: string) => void;
  clearTenantContext: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [tenantData, setTenantData] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize tenant context from URL or localStorage
  useEffect(() => {
    initializeTenantContext();
  }, []);

  const initializeTenantContext = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Extract tenant info from URL or stored context
      const urlTenantId = extractTenantFromUrl();
      const storedTenantId = localStorage.getItem('currentTenantId');

      const targetTenantId = urlTenantId || storedTenantId;

      if (targetTenantId) {
        await loadTenantData(targetTenantId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize tenant context');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTenantData = async (tenantId: string) => {
    const tenant = await tenantService.getTenantById(tenantId);
    setTenantId(tenantId);
    setMerchantId(tenant.subdomain);
    setTenantData(tenant);

    // Store in localStorage for persistence
    localStorage.setItem('currentTenantId', tenantId);
    localStorage.setItem('currentMerchantId', tenant.subdomain);
  };

  const setTenantContext = async (newTenantId: string) => {
    try {
      setIsLoading(true);
      await loadTenantData(newTenantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set tenant context');
    } finally {
      setIsLoading(false);
    }
  };

  const clearTenantContext = () => {
    setTenantId(null);
    setMerchantId(null);
    setTenantData(null);
    localStorage.removeItem('currentTenantId');
    localStorage.removeItem('currentMerchantId');
  };

  const refreshTenant = async () => {
    if (tenantId) {
      await loadTenantData(tenantId);
    }
  };

  const extractTenantFromUrl = (): string | null => {
    if (typeof window === 'undefined') return null;

    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    // Check for admin subdomain pattern: admin.enwhe.io/store/{merchant-id}/
    if (hostname === 'admin.enwhe.io') {
      const match = pathname.match(/^\/store\/([^\/]+)/);
      return match ? match[1] : null;
    }

    // Check for merchant subdomain pattern: {merchant-id}.enwhe.io
    if (hostname.endsWith('.enwhe.io') && hostname !== 'admin.enwhe.io') {
      return hostname.split('.')[0];
    }

    return null;
  };

  return (
    <TenantContext.Provider value={{
      tenantId,
      merchantId,
      tenantData,
      isLoading,
      error,
      refreshTenant,
      setTenantContext,
      clearTenantContext
    }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
```

### API Integration with Tenant Context

```typescript
// frontend/src/lib/api-client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useTenant } from '@/contexts/TenantContext';

class ApiClient {
  private client: AxiosInstance;
  private tenantId: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  setTenantContext(tenantId: string | null) {
    this.tenantId = tenantId;
  }

  private setupInterceptors() {
    // Request interceptor to add tenant context
    this.client.interceptors.request.use(
      (config) => {
        // Add tenant context to headers if available
        if (this.tenantId) {
          config.headers['X-Tenant-ID'] = this.tenantId;
        }

        // Add authentication token
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 403) {
          // Handle tenant isolation violations
          console.error('Tenant access violation:', error.response.data);
          // Redirect to appropriate error page or clear context
        }

        if (error.response?.status === 401) {
          // Handle authentication errors
          this.clearAuthToken();
          // Redirect to login
        }

        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authToken');
  }

  private clearAuthToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }

  // Admin API methods
  async getAdminDashboard(merchantId: string) {
    return this.client.get(`/api/v1/admin/${merchantId}/dashboard`);
  }

  async getAdminProducts(merchantId: string) {
    return this.client.get(`/api/v1/admin/${merchantId}/products`);
  }

  async createAdminProduct(merchantId: string, productData: any) {
    return this.client.post(`/api/v1/admin/${merchantId}/products`, productData);
  }

  // Storefront API methods
  async getStorefrontProducts(merchantId: string) {
    return this.client.get(`/api/v1/storefront/${merchantId}/products`);
  }

  async getStorefrontProduct(merchantId: string, productId: string) {
    return this.client.get(`/api/v1/storefront/${merchantId}/products/${productId}`);
  }

  // Tenant management
  async checkSubdomain(subdomain: string) {
    return this.client.get(`/api/v1/tenants/check-subdomain?subdomain=${subdomain}`);
  }

  async getTenantBySubdomain(subdomain: string) {
    return this.client.get(`/api/v1/tenants/subdomain/${subdomain}`);
  }
}

export const apiClient = new ApiClient();

// React hook for API client with tenant context
export const useApiClient = () => {
  const { tenantId } = useTenant();

  useEffect(() => {
    apiClient.setTenantContext(tenantId);
  }, [tenantId]);

  return apiClient;
};
```

---

## 2. Error Handling and Recovery Integration

### Frontend Error Boundary with Backend Integration

```typescript
// frontend/src/components/TenantErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { retryManager } from '@/lib/retry-manager';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

export class TenantErrorBoundary extends Component<Props, State> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      retryCount: 0,
      isRetrying: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Tenant Error Boundary caught an error:', error, errorInfo);

    // Report error to backend monitoring
    this.reportError(error, errorInfo);
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  private async reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      await fetch('/api/v1/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  }

  private handleRetry = async () => {
    if (this.state.retryCount >= 3) {
      // Max retries reached
      return;
    }

    this.setState({ isRetrying: true });

    try {
      // Use backend retry manager patterns
      await retryManager.executeWithRetry(
        async () => {
          // Clear error state and retry
          this.setState({
            hasError: false,
            error: null,
            isRetrying: false,
            retryCount: this.state.retryCount + 1,
          });
        },
        {
          maxAttempts: 1,
          baseDelay: 1000,
          maxDelay: 5000,
        }
      );
    } catch (retryError) {
      this.setState({ isRetrying: false });
      console.error('Retry failed:', retryError);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>

              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Something went wrong
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    We encountered an error while loading this page. This might be a temporary issue.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col space-y-3">
                <button
                  onClick={this.handleRetry}
                  disabled={this.state.isRetrying || this.state.retryCount >= 3}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {this.state.isRetrying ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Retrying...
                    </>
                  ) : (
                    `Try Again ${this.state.retryCount > 0 ? `(${this.state.retryCount}/3)` : ''}`
                  )}
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Reload Page
                </button>

                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Home
                </button>
              </div>

              {this.state.error && (
                <details className="mt-4">
                  <summary className="text-sm text-gray-600 cursor-pointer">Error Details</summary>
                  <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-32">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

### Frontend Retry Manager Integration

```typescript
// frontend/src/lib/retry-manager.ts
interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
}

class FrontendRetryManager {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      jitter = true,
    } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxAttempts) {
          throw lastError;
        }

        // Calculate delay with exponential backoff
        let delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay);

        // Add jitter to prevent thundering herd
        if (jitter) {
          delay = delay * (0.5 + Math.random() * 0.5);
        }

        console.warn(`Operation failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms:`, error);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitKey: string,
    options: RetryOptions = {}
  ): Promise<T> {
    // Simple circuit breaker implementation
    const circuitState = this.getCircuitState(circuitKey);

    if (circuitState.isOpen()) {
      throw new Error(`Circuit breaker is open for ${circuitKey}`);
    }

    try {
      const result = await this.executeWithRetry(operation, options);
      circuitState.recordSuccess();
      return result;
    } catch (error) {
      circuitState.recordFailure();
      throw error;
    }
  }

  private getCircuitState(key: string) {
    // Simplified circuit breaker state management
    const state = {
      failures: 0,
      lastFailureTime: 0,
      isOpen: () => state.failures >= 5 && Date.now() - state.lastFailureTime < 60000,
      recordSuccess: () => { state.failures = 0; },
      recordFailure: () => {
        state.failures++;
        state.lastFailureTime = Date.now();
      },
    };
    return state;
  }
}

export const retryManager = new FrontendRetryManager();
```

---

## 3. Performance Integration Patterns

### Cache Integration with Backend Performance System

```typescript
// frontend/src/lib/cache-integration.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  tenantId: string;
}

class FrontendCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, tenantId: string, ttl: number = this.DEFAULT_TTL): void {
    const now = Date.now();
    const tenantKey = `${tenantId}:${key}`;

    this.cache.set(tenantKey, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      tenantId,
    });

    // Clean up expired entries periodically
    this.cleanupExpired();
  }

  get<T>(key: string, tenantId: string): T | null {
    const tenantKey = `${tenantId}:${key}`;
    const entry = this.cache.get(tenantKey);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(tenantKey);
      return null;
    }

    return entry.data;
  }

  invalidate(key: string, tenantId?: string): void {
    if (tenantId) {
      const tenantKey = `${tenantId}:${key}`;
      this.cache.delete(tenantKey);
    } else {
      // Invalidate across all tenants
      for (const cacheKey of this.cache.keys()) {
        if (cacheKey.endsWith(`:${key}`)) {
          this.cache.delete(cacheKey);
        }
      }
    }
  }

  invalidateTenant(tenantId: string): void {
    for (const [cacheKey, entry] of this.cache.entries()) {
      if (entry.tenantId === tenantId) {
        this.cache.delete(cacheKey);
      }
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    const now = Date.now();
    const total = this.cache.size;
    const expired = Array.from(this.cache.values()).filter(entry => now > entry.expiresAt).length;

    return {
      total,
      active: total - expired,
      expired,
    };
  }
}

export const cacheManager = new FrontendCacheManager();

// React hook for cached API calls
export const useCachedApiCall = <T>(
  key: string,
  apiCall: () => Promise<T>,
  tenantId: string | null,
  options: {
    ttl?: number;
    enabled?: boolean;
    refetchOnMount?: boolean;
  } = {}
) => {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes
    enabled = true,
    refetchOnMount = false,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled || !tenantId) return;

    // Check cache first (unless forced refresh)
    if (!forceRefresh) {
      const cachedData = cacheManager.get<T>(key, tenantId);
      if (cachedData) {
        setData(cachedData);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await retryManager.executeWithRetry(apiCall, {
        maxAttempts: 3,
        baseDelay: 1000,
      });

      setData(result);
      cacheManager.set(key, result, tenantId, ttl);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [key, apiCall, tenantId, enabled, ttl]);

  useEffect(() => {
    if (refetchOnMount || !data) {
      fetchData();
    }
  }, [fetchData, refetchOnMount, data]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
};
```

---

## 4. RLS-Aware Data Loading Patterns

### Tenant-Scoped Data Hooks

```typescript
// frontend/src/hooks/useTenantData.ts
import { useMemo } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useCachedApiCall } from '@/lib/cache-integration';
import { apiClient } from '@/lib/api-client';

export const useTenantProducts = (options: { enabled?: boolean } = {}) => {
  const { tenantId, merchantId } = useTenant();
  const { enabled = true } = options;

  const apiCall = useMemo(
    () => () => merchantId ? apiClient.getAdminProducts(merchantId) : Promise.reject(new Error('No merchant ID')),
    [merchantId]
  );

  return useCachedApiCall(
    'admin-products',
    apiCall,
    tenantId,
    {
      enabled: enabled && !!merchantId,
      ttl: 2 * 60 * 1000, // 2 minutes for products
    }
  );
};

export const useTenantOrders = (options: { enabled?: boolean } = {}) => {
  const { tenantId, merchantId } = useTenant();
  const { enabled = true } = options;

  const apiCall = useMemo(
    () => () => merchantId ? apiClient.get(`/api/v1/admin/${merchantId}/orders`) : Promise.reject(new Error('No merchant ID')),
    [merchantId]
  );

  return useCachedApiCall(
    'admin-orders',
    apiCall,
    tenantId,
    {
      enabled: enabled && !!merchantId,
      ttl: 1 * 60 * 1000, // 1 minute for orders (more dynamic)
    }
  );
};

export const useTenantDashboard = () => {
  const { tenantId, merchantId } = useTenant();

  const apiCall = useMemo(
    () => () => merchantId ? apiClient.getAdminDashboard(merchantId) : Promise.reject(new Error('No merchant ID')),
    [merchantId]
  );

  return useCachedApiCall(
    'admin-dashboard',
    apiCall,
    tenantId,
    {
      enabled: !!merchantId,
      ttl: 30 * 1000, // 30 seconds for dashboard (very dynamic)
    }
  );
};

// Storefront-specific hooks
export const useStorefrontProducts = (merchantId: string) => {
  const apiCall = useMemo(
    () => () => apiClient.getStorefrontProducts(merchantId),
    [merchantId]
  );

  return useCachedApiCall(
    'storefront-products',
    apiCall,
    merchantId, // Use merchantId as tenantId for storefront
    {
      enabled: !!merchantId,
      ttl: 10 * 60 * 1000, // 10 minutes for storefront products
    }
  );
};
```

---

## 5. Migration-Aware Frontend Components

### Migration Status Indicator

```typescript
// frontend/src/components/MigrationStatusIndicator.tsx
import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/contexts/TenantContext';

interface MigrationStatus {
  rls_enabled: boolean;
  tenant_isolation_active: boolean;
  legacy_data_migrated: boolean;
  performance_optimized: boolean;
  last_migration_date: string | null;
  migration_warnings: string[];
}

export const MigrationStatusIndicator: React.FC = () => {
  const { tenantId } = useTenant();
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      checkMigrationStatus();
    }
  }, [tenantId]);

  const checkMigrationStatus = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/api/v1/system/migration-status');
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to check migration status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span>Checking system status...</span>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const allSystemsOperational = status.rls_enabled &&
                               status.tenant_isolation_active &&
                               status.legacy_data_migrated &&
                               status.performance_optimized;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">System Status</h3>
        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          allSystemsOperational
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {allSystemsOperational ? '✅ All Systems Operational' : '⚠️ Partial Systems'}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <StatusItem
          label="Tenant Isolation"
          active={status.rls_enabled && status.tenant_isolation_active}
          description="RLS policies active"
        />
        <StatusItem
          label="Data Migration"
          active={status.legacy_data_migrated}
          description="Legacy data processed"
        />
        <StatusItem
          label="Performance Layer"
          active={status.performance_optimized}
          description="Caching & optimization"
        />
        <StatusItem
          label="Security Layer"
          active={status.rls_enabled}
          description="Row-level security"
        />
      </div>

      {status.migration_warnings.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="text-sm text-yellow-800">
            <strong>Migration Warnings:</strong>
            <ul className="mt-1 list-disc list-inside">
              {status.migration_warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {status.last_migration_date && (
        <div className="mt-3 text-xs text-gray-500">
          Last migration: {new Date(status.last_migration_date).toLocaleString()}
        </div>
      )}
    </div>
  );
};

const StatusItem: React.FC<{
  label: string;
  active: boolean;
  description: string;
}> = ({ label, active, description }) => (
  <div className="flex items-start space-x-3">
    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
      active ? 'bg-green-500' : 'bg-red-500'
    }`} />
    <div>
      <div className="text-sm font-medium text-gray-900">{label}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </div>
  </div>
);
```

---

## 6. Coordination Checklist

### Integration Validation Checklist

```markdown
## Frontend Integration Checklist

### Tenant Context Management
- [ ] TenantProvider properly wraps the app
- [ ] Tenant context extracted from URL patterns
- [ ] Tenant context persisted in localStorage
- [ ] API client configured with tenant headers
- [ ] Error handling for tenant context failures

### API Integration
- [ ] All API calls include tenant context headers
- [ ] Admin API endpoints follow `/api/v1/admin/{merchant-id}/` pattern
- [ ] Storefront API endpoints follow `/api/v1/storefront/{merchant-id}/` pattern
- [ ] Authentication tokens properly attached
- [ ] 403 errors handled for tenant isolation violations

### Error Handling
- [ ] TenantErrorBoundary wraps critical components
- [ ] Retry logic integrates with backend retry patterns
- [ ] Circuit breaker patterns implemented
- [ ] Error reporting to backend monitoring

### Performance Integration
- [ ] Frontend caching respects tenant boundaries
- [ ] Cache invalidation aligned with backend updates
- [ ] Tenant-scoped cache keys used
- [ ] Performance metrics reported to backend

### RLS Integration
- [ ] Data loading hooks respect tenant context
- [ ] No cross-tenant data leakage in UI
- [ ] Migration status visible to administrators
- [ ] Legacy data migration warnings displayed

### Testing Integration
- [ ] Tests validate tenant isolation in UI
- [ ] Tests verify API integration patterns
- [ ] Tests confirm error handling flows
- [ ] Tests validate cache behavior

### Deployment Coordination
- [ ] Environment variables properly configured
- [ ] Backend RLS migration completed before frontend deployment
- [ ] Migration status API available
- [ ] Performance monitoring integrated
```

---

## Summary

This integration guide provides comprehensive patterns for Track B (Frontend) to seamlessly work with Track A's backend implementations:

1. **Tenant Context Management** - Automatic tenant detection and context management
2. **Error Handling Integration** - Frontend error boundaries with backend retry patterns
3. **Performance Integration** - Tenant-aware caching aligned with backend optimization
4. **RLS-Aware Data Loading** - Hooks that respect tenant isolation boundaries
5. **Migration Awareness** - Components that show migration status and warnings

These patterns ensure that the frontend properly integrates with the backend's RLS system, performance optimizations, and error recovery mechanisms while maintaining complete tenant isolation and security.