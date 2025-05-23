// Try dynamic import as a workaround
// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require('axios').default || require('axios');

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

// Create axios instance with base configuration
const apiClient = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

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