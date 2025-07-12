import axios from 'axios'
import { useAuth } from '@clerk/nextjs'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Add request interceptor to include auth token
api.interceptors.request.use(
    async (config) => {
        // Get Clerk token dynamically
        try {
            // For client-side requests, we'll need to get the token from Clerk
            // This will be handled by individual components that have access to useAuth
            const token = localStorage.getItem('clerk_token')
            if (token) {
                config.headers.Authorization = `Bearer ${token}`
            }
        } catch (error) {
            console.error('Error getting auth token:', error)
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized access
            localStorage.removeItem('clerk_token')
            // Redirect to sign-in page
            if (typeof window !== 'undefined') {
                window.location.href = '/'
            }
        }
        return Promise.reject(error)
    }
)

// Helper function to create authenticated API client
export const createAuthenticatedApi = (token: string) => {
    const authenticatedApi = axios.create({
        baseURL: API_BASE_URL,
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
    })

    // Add response interceptor for error handling
    authenticatedApi.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401) {
                // Handle unauthorized access
                if (typeof window !== 'undefined') {
                    window.location.href = '/'
                }
            }
            return Promise.reject(error)
        }
    )

    return authenticatedApi
}

export default api