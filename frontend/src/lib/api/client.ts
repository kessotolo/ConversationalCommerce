import axios from 'axios';
import { useAuth } from '@clerk/nextjs';

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
    timeout: 30000
});

// Helper function to get token
const getAuthHeader = async () => {
    const { getToken } = useAuth();
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper functions for common API calls
export const get = async <T>(url: string, params?: any) => {
    const headers = await getAuthHeader();
    return apiClient.get<ApiResponse<T>>(url, { params, headers });
};

export const post = async <T>(url: string, data?: any) => {
    const headers = await getAuthHeader();
    return apiClient.post<ApiResponse<T>>(url, data, { headers });
};

export const put = async <T>(url: string, data?: any) => {
    const headers = await getAuthHeader();
    return apiClient.put<ApiResponse<T>>(url, data, { headers });
};

export const del = async <T>(url: string) => {
    const headers = await getAuthHeader();
    return apiClient.delete<ApiResponse<T>>(url, { headers });
};

// Response interceptor for handling errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Server responded with an error
            return Promise.reject({
                message: error.response.data?.message || 'An error occurred',
                status: error.response.status,
                code: error.response.data?.code,
                details: error.response.data?.details
            });
        } else if (error.request) {
            // Request made but no response
            return Promise.reject({
                message: 'No response from server',
                status: 0
            });
        } else {
            // Something happened in setting up the request
            return Promise.reject({
                message: error.message,
                status: 0
            });
        }
    }
);

export default apiClient;
