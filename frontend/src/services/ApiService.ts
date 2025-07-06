import axios, { AxiosResponse } from 'axios';
import { API_BASE_URL } from '../config';

/**
 * Standardized API service for making HTTP requests
 */
export class ApiService {
    private static baseURL = API_BASE_URL;

    /**
     * GET request
     */
    static async get<T = any>(url: string): Promise<AxiosResponse<T>> {
        return axios.get(`${this.baseURL}${url}`);
    }

    /**
     * POST request
     */
    static async post<T = any>(url: string, data?: any): Promise<AxiosResponse<T>> {
        return axios.post(`${this.baseURL}${url}`, data);
    }

    /**
     * PUT request
     */
    static async put<T = any>(url: string, data?: any): Promise<AxiosResponse<T>> {
        return axios.put(`${this.baseURL}${url}`, data);
    }

    /**
     * DELETE request
     */
    static async delete<T = any>(url: string): Promise<AxiosResponse<T>> {
        return axios.delete(`${this.baseURL}${url}`);
    }

    /**
     * PATCH request
     */
    static async patch<T = any>(url: string, data?: any): Promise<AxiosResponse<T>> {
        return axios.patch(`${this.baseURL}${url}`, data);
    }
}