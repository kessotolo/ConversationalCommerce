import * as React from 'react';
// Try dynamic import as a workaround
// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require('axios').default || require('axios');

// Import standardized configuration optimized for African markets
import { Product } from '@/types/product';
import { Order } from '@/types/order';
import { API_BASE_URL, API_TIMEOUT, RETRY_ATTEMPTS, FEATURES } from '../config';

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
apiClient.interceptors.response.use(null, async (error: any) => {
    const { config } = error;
    if (!config || !config.retry) {
        config.retry = 0;
    }
    
    if (config.retry >= RETRY_ATTEMPTS) {
        return Promise.reject(error);
    }
    
    // Exponential backoff for retries
    config.retry += 1;
    const delay = 1000 * Math.pow(2, config.retry);
    await new Promise(resolve => setTimeout(resolve, delay));
    return apiClient(config);
});

// Add offline detection and queueing if enabled
if (FEATURES.offlineMode && typeof window !== 'undefined') {
    // Simple online status detection
    let isOnline = navigator.onLine;
    window.addEventListener('online', () => { isOnline = true; });
    window.addEventListener('offline', () => { isOnline = false; });
    
    // Request queue for offline mode
    const requestQueue: any[] = [];
    
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
apiClient.interceptors.request.use((config: any) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('clerk-token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
    (response: any) => response,
    (error: any) => {
        console.error('API error:', error);
        return Promise.reject({
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            errors: error.response?.data?.errors,
        });
    }
);

// Product endpoints
export const productService = {
    getProducts: async () => {
        const response = await apiClient.get('/api/v1/products');
        return response.data;
    },

    getProduct: async (id: string) => {
        const response = await apiClient.get(`/api/v1/products/${id}`);
        return response.data;
    },

    createProduct: async (data: any) => {
        const response = await apiClient.post('/api/v1/products', data);
        return response.data;
    },

    updateProduct: async (id: string, data: any) => {
        const response = await apiClient.put(`/api/v1/products/${id}`, data);
        return response.data;
    },

    deleteProduct: async (id: string) => {
        const response = await apiClient.delete(`/api/v1/products/${id}`);
        return response.data;
    },

    uploadImage: async (formData: FormData) => {
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
    getOrders: async () => {
        const response = await apiClient.get('/api/v1/orders');
        return response.data;
    },

    getOrder: async (id: string) => {
        const response = await apiClient.get(`/api/v1/orders/${id}`);
        return response.data;
    },

    createOrder: async (data: any) => {
        const response = await apiClient.post('/api/v1/orders', data);
        return response.data;
    },

    updateOrderStatus: async (id: string, status: string) => {
        const response = await apiClient.patch(`/api/v1/orders/${id}/status`, { status });
        return response.data;
    },
};

// Dashboard endpoints
export const dashboardService = {
    getStats: async () => {
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
        return false;
    }
};

export { apiClient };