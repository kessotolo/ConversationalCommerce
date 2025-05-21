import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getToken } from '../auth/getToken';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
    async (config: AxiosRequestConfig) => {
        const token = await getToken();
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Redirect to sign-in page on auth error
            window.location.href = '/sign-in';
        }
        return Promise.reject(error);
    }
);

export default apiClient;
