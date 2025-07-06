import type { Result, ApiResponse } from '@/modules/core';
import type { IPAllowlistEntry, SecurityAuditLog, SecuritySettings } from '../models/security';

class SecurityService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    }

    private getAuthToken(): string {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('auth_token') || '';
        }
        return '';
    }

    async getIPAllowlist(): Promise<Result<IPAllowlistEntry[], Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/security/ip-allowlist`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: ApiResponse<IPAllowlistEntry[]> = await response.json();

            if (!data.success || !data.data) {
                throw new Error(data.error || 'Failed to fetch IP allowlist');
            }

            return {
                success: true,
                data: data.data
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred')
            };
        }
    }

    async addIPAllowlistEntry(entry: Omit<IPAllowlistEntry, 'id' | 'created_at' | 'updated_at'>): Promise<Result<IPAllowlistEntry, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/security/ip-allowlist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify(entry)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: ApiResponse<IPAllowlistEntry> = await response.json();

            if (!data.success || !data.data) {
                throw new Error(data.error || 'Failed to add IP allowlist entry');
            }

            return {
                success: true,
                data: data.data
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred')
            };
        }
    }

    async removeIPAllowlistEntry(id: string): Promise<Result<void, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/security/ip-allowlist/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return {
                success: true,
                data: undefined
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred')
            };
        }
    }

    async getSecurityAuditLogs(page: number = 1, limit: number = 50): Promise<Result<SecurityAuditLog[], Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/security/audit-logs?page=${page}&limit=${limit}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: ApiResponse<SecurityAuditLog[]> = await response.json();

            if (!data.success || !data.data) {
                throw new Error(data.error || 'Failed to fetch security audit logs');
            }

            return {
                success: true,
                data: data.data
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred')
            };
        }
    }

    async getSecuritySettings(): Promise<Result<SecuritySettings, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/security/settings`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: ApiResponse<SecuritySettings> = await response.json();

            if (!data.success || !data.data) {
                throw new Error(data.error || 'Failed to fetch security settings');
            }

            return {
                success: true,
                data: data.data
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred')
            };
        }
    }

    async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<Result<SecuritySettings, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/security/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify(settings)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: ApiResponse<SecuritySettings> = await response.json();

            if (!data.success || !data.data) {
                throw new Error(data.error || 'Failed to update security settings');
            }

            return {
                success: true,
                data: data.data
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred')
            };
        }
    }
}

export const securityService = new SecurityService();