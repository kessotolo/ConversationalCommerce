/**
 * API Service for Conversational Commerce Platform
 * Connects Next.js frontend to FastAPI backend with Clerk authentication
 */

// API URL from environment or default to localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Define response and error types for better type safety
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: any;
}

// Function to get token - can be used on client side
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    // Client-side - in real implementation this would use Clerk's getToken()
    return localStorage.getItem('clerk-token') || null;
  }
  return null;
};

// Simple function to create headers with auth token
const createHeaders = (contentType = 'application/json'): HeadersInit => {
  const headers: Record<string, string> = {
    'Content-Type': contentType,
  };
  
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Generic API request function
const apiRequest = async <T>(
  endpoint: string,
  method: string,
  data?: any,
  customHeaders?: HeadersInit
): Promise<T> => {
  const url = `${API_URL}${endpoint}`;
  const headers = customHeaders || createHeaders();
  
  const options: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };
  
  if (data && method !== 'GET') {
    if (data instanceof FormData) {
      options.body = data;
      // Remove content-type to let browser set it with boundary
      if (headers instanceof Headers) {
        headers.delete('Content-Type');
      } else if (typeof headers === 'object') {
        delete (headers as Record<string, string>)['Content-Type'];
      }
    } else {
      options.body = JSON.stringify(data);
    }
  }
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: errorData.message || response.statusText,
        errors: errorData.errors,
      };
    }
    
    // Handle both JSON responses and empty responses (204 No Content)
    if (response.status !== 204) {
      const result = await response.json();
      return result as T;
    }
    
    return {} as T;
  } catch (error: any) {
    console.error(`API error (${method} ${endpoint}):`, error);
    throw error;
  }
};


// Product endpoints
export const productService = {
  getProducts: async () => {
    return apiRequest('/api/v1/products', 'GET');
  },
  
  getProduct: async (id: string) => {
    return apiRequest(`/api/v1/products/${id}`, 'GET');
  },
  
  createProduct: async (data: any) => {
    return apiRequest('/api/v1/products', 'POST', data);
  },
  
  updateProduct: async (id: string, data: any) => {
    return apiRequest(`/api/v1/products/${id}`, 'PUT', data);
  },
  
  deleteProduct: async (id: string) => {
    return apiRequest(`/api/v1/products/${id}`, 'DELETE');
  },
  
  uploadImage: async (formData: FormData) => {
    return apiRequest('/api/v1/products/upload-image', 'POST', formData);
  },
};

// Order endpoints
export const orderService = {
  getOrders: async () => {
    return apiRequest('/api/v1/orders', 'GET');
  },
  
  getOrder: async (id: string) => {
    return apiRequest(`/api/v1/orders/${id}`, 'GET');
  },
  
  createOrder: async (data: any) => {
    return apiRequest('/api/v1/orders', 'POST', data);
  },
  
  updateOrderStatus: async (id: string, status: string) => {
    return apiRequest(`/api/v1/orders/${id}/status`, 'PATCH', { status });
  },
};

// Dashboard endpoints
export const dashboardService = {
  getStats: async () => {
    return apiRequest('/api/v1/dashboard/stats', 'GET');
  },
};

// Health check function to test backend connection
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data?.status === 'ok';
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
};

// Auth-related functions for Clerk integration
export const authService = {
  verifySession: async () => {
    return apiRequest('/api/auth/verify', 'GET');
  },
  
  getUserProfile: async () => {
    return apiRequest('/api/v1/users/profile', 'GET');
  },
  
  updateUserProfile: async (data: any) => {
    return apiRequest('/api/v1/users/profile', 'PUT', data);
  },
};
