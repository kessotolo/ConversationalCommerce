// Try dynamic import as a workaround

// Import standardized configuration optimized for African markets
import type { DashboardStatsResponse } from '@/modules/core/models/dashboard';
import type {
  Order,
  CreateOrderRequest,
  OrderResponse,
  OrdersResponse,
} from '@/modules/core/models/order';
import type {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  ProductResponse,
  ProductsResponse,
} from '@/modules/core/models/product';

import { API_BASE_URL, API_TIMEOUT, RETRY_ATTEMPTS, FEATURES } from '@/config';
import { parseApiError } from '@/lib/utils';

// Import types

const axios = require('axios').default || require('axios');

// Define response and error types for better type safety
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, unknown>;
}

// Create axios instance with base configuration optimized for intermittent connectivity
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT, // Longer timeout for variable connectivity in African markets
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Add retry logic for better resilience in low-connectivity environments
apiClient.interceptors.response.use(null, async (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('config' in error)) {
    throw parseApiError(error);
  }
  const err = error as { config: unknown };
  if (typeof err.config === 'object' && err.config !== null) {
    const config = err.config as Record<string, any>;
    if (!config.retry) {
      config.retry = 0;
    }
    if (config.retry >= RETRY_ATTEMPTS) {
      throw parseApiError(error);
    }
    config.retry += 1;
    const delay = 1000 * Math.pow(2, config.retry);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return apiClient(config);
  }
  throw parseApiError(error);
});

// Add offline detection and queueing if enabled
if (FEATURES.offlineMode && typeof window !== 'undefined') {
  // Simple online status detection
  let isOnline = navigator.onLine;
  window.addEventListener('online', () => {
    isOnline = true;
  });
  window.addEventListener('offline', () => {
    isOnline = false;
  });

  // Request queue for offline mode
  const requestQueue: Array<Record<string, unknown>> = [];

  // Process queue when back online
  window.addEventListener('online', async () => {
    while (requestQueue.length > 0) {
      const request = requestQueue.shift();
      try {
        await apiClient(request);
      } catch (error) {
        console.error('Failed to process offline request:', error);
      }
    }
  });
}

// Add request interceptor to include auth token
apiClient.interceptors.request.use((config: unknown) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('clerk-token');
    if (token && typeof config === 'object' && config !== null && 'headers' in config) {
      (config as { headers: Record<string, string> }).headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response: unknown) => response,
  (error: unknown) => {
    console.error('API error:', error);
    throw parseApiError(error);
  },
);

// Product endpoints
export const productService = {
  getProducts: async (): Promise<ApiResponse<ProductsResponse>> => {
    const response = await apiClient.get('/api/v1/products');
    return response.data;
  },

  getProduct: async (id: string): Promise<ApiResponse<ProductResponse>> => {
    const response = await apiClient.get(`/api/v1/products/${id}`);
    return response.data;
  },

  createProduct: async (data: CreateProductRequest): Promise<ApiResponse<ProductResponse>> => {
    const response = await apiClient.post('/api/v1/products', data);
    return response.data;
  },

  updateProduct: async (
    id: string,
    data: UpdateProductRequest,
  ): Promise<ApiResponse<ProductResponse>> => {
    const response = await apiClient.put(`/api/v1/products/${id}`, data);
    return response.data;
  },

  deleteProduct: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    const response = await apiClient.delete(`/api/v1/products/${id}`);
    return response.data;
  },

  uploadImage: async (formData: FormData): Promise<ApiResponse<{ imageUrl: string }>> => {
    const response = await apiClient.post('/api/v1/products/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Order endpoints
export const orderService = {
  getOrders: async (): Promise<ApiResponse<OrdersResponse>> => {
    const response = await apiClient.get('/api/v1/orders');
    return response.data;
  },

  getOrder: async (id: string): Promise<ApiResponse<OrderResponse>> => {
    const response = await apiClient.get(`/api/v1/orders/${id}`);
    return response.data;
  },

  createOrder: async (data: CreateOrderRequest): Promise<ApiResponse<OrderResponse>> => {
    const response = await apiClient.post('/api/v1/orders', data);
    return response.data;
  },

  updateOrderStatus: async (id: string, status: string): Promise<ApiResponse<OrderResponse>> => {
    const response = await apiClient.patch(`/api/v1/orders/${id}/status`, { status });
    return response.data;
  },
};

// Dashboard endpoints
export const dashboardService = {
  getStats: async (): Promise<ApiResponse<DashboardStatsResponse>> => {
    const response = await apiClient.get('/api/v1/dashboard/stats');
    return response.data;
  },
};

// Health check function
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/health');
    return response.data?.status === 'ok';
  } catch (error) {
    console.error('Backend health check failed:', error);
    throw parseApiError(error);
  }
};

export { apiClient };
