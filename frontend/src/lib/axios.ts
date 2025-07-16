/**
 * Axios configuration for API calls
 * Includes tenant context, authentication, and error handling
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Create base axios instance
const api: AxiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
    timeout: 30000, // 30 seconds for slow connections
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token and tenant context
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        try {
            // Add auth token if available (client-side only)
            if (typeof window !== 'undefined') {
                // Client-side: get token from Clerk
                const token = await (window as any).__clerk?.session?.getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }

            // Add tenant context from URL or headers
            if (typeof window !== 'undefined') {
                const hostname = window.location.hostname;
                const subdomain = hostname.split('.')[0];

                // Check if this is a merchant subdomain
                if (hostname !== 'localhost' && hostname !== '127.0.0.1' && subdomain !== 'app' && subdomain !== 'admin') {
                    config.headers['X-Tenant-ID'] = subdomain;
                }
            }

            return config;
        } catch (error) {
            console.error('Request interceptor error:', error);
            return config;
        }
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error: AxiosError) => {
        // Handle common error cases
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    // Unauthorized - redirect to login
                    if (typeof window !== 'undefined') {
                        window.location.href = '/sign-in';
                    }
                    break;
                case 403:
                    // Forbidden - insufficient permissions
                    console.error('Insufficient permissions for API request');
                    break;
                case 404:
                    // Not found
                    console.error('API endpoint not found:', error.config?.url);
                    break;
                case 429:
                    // Rate limited
                    console.warn('API rate limit exceeded');
                    break;
                case 500:
                    // Server error
                    console.error('Server error:', error.response.data);
                    break;
                default:
                    console.error('API error:', error.response.status, error.response.data);
            }
        } else if (error.request) {
            // Network error
            console.error('Network error:', error.message);
        } else {
            // Other error
            console.error('Request error:', error.message);
        }

        return Promise.reject(error);
    }
);

// Helper function to create tenant-specific API instance
export function createTenantApi(tenantId: string): AxiosInstance {
    const tenantApi = axios.create({
        ...api.defaults,
        headers: {
            ...api.defaults.headers,
            'X-Tenant-ID': tenantId,
        },
    });

    // Copy interceptors
    tenantApi.interceptors.request = api.interceptors.request;
    tenantApi.interceptors.response = api.interceptors.response;

    return tenantApi;
}

// Export types for better TypeScript support
export type { AxiosResponse, AxiosError } from 'axios';

// Export the configured instance
export { api };
export default api;