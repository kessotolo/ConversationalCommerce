import axios from 'axios';
import { getToken } from '../auth/getToken';

// API Error interface
export interface ApiError {
    message: string;
    status: number;
    code?: string;
    details?: any;
}

// API Response interface
export interface ApiResponse<T> {
    data: T;
    status: number;
    message?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create API client with base configuration
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
    async (config: any) => {
        const token = await getToken();
        if (token) {
            config.headers = {
                ...config.headers,
                Authorization: `Bearer ${token}`
            };
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Server responded with an error
            const apiError: ApiError = {
                message: error.response.data?.message || 'An error occurred',
                status: error.response.status,
                code: error.response.data?.code,
                details: error.response.data?.details,
            };
            return Promise.reject(apiError);
        } else if (error.request) {
            // Request made but no response
            return Promise.reject({
                message: 'No response from server',
                status: 0,
            });
        } else {
            // Something happened in setting up the request
            return Promise.reject({
                message: error.message,
                status: 0,
            });
        }
    }
);

// Helper functions for common API calls
export const get = <T>(url: string, params?: any) =>
    apiClient.get<ApiResponse<T>>(url, { params });

export const post = <T>(url: string, data?: any) =>
    apiClient.post<ApiResponse<T>>(url, data);

export const put = <T>(url: string, data?: any) =>
    apiClient.put<ApiResponse<T>>(url, data);

export const del = <T>(url: string) =>
    apiClient.delete<ApiResponse<T>>(url);

export default apiClient;
