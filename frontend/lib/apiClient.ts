import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

interface ApiResponse<T = any> {
    data: T;
    errors?: {
        message: string;
        code: string;
    }[];
    meta?: {
        page?: number;
        total?: number;
        limit?: number;
    };
}

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        this.client.interceptors.request.use(
            async (config: AxiosRequestConfig) => {
                const token = localStorage.getItem('token');
                if (token && config.headers) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        this.client.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                if (error.response?.status === 401) {
                    // Handle unauthorized access
                    localStorage.removeItem('token');
                    window.location.href = '/sign-in';
                }
                return Promise.reject(this.handleError(error));
            }
        );
    }

    private handleError(error: AxiosError): Error {
        if (error.response?.data) {
            const apiError = error.response.data as ApiResponse;
            if (apiError.errors?.length) {
                return new Error(apiError.errors[0].message);
            }
        }
        return new Error(error.message || 'An unexpected error occurred');
    }

    async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.get<ApiResponse<T>>(url, config);
        return response.data;
    }

    async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.post<ApiResponse<T>>(url, data, config);
        return response.data;
    }

    async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.put<ApiResponse<T>>(url, data, config);
        return response.data;
    }

    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.client.delete<ApiResponse<T>>(url, config);
        return response.data;
    }
}

export const apiClient = new ApiClient();
export default apiClient;