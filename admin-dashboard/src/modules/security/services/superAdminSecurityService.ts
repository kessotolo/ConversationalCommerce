import type { Result } from '@/modules/core';
import type {
    SuperAdminTOTPStatus,
    SuperAdminTOTPSetup,
    SuperAdminIPAllowlistEntry,
    SuperAdminEmergencyLockout,
    SuperAdminAuditLog
} from '../models/superAdminSecurity';

class SuperAdminSecurityService {
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

    private getAuthHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`
        };
    }

    // Two-Factor Authentication Methods
    async get2FAStatus(): Promise<Result<SuperAdminTOTPStatus, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/super-admin/security/2fa/status`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                success: true,
                data
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred')
            };
        }
    }

    async setup2FA(): Promise<Result<SuperAdminTOTPSetup, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/super-admin/security/2fa/setup`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                success: true,
                data
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred')
            };
        }
    }

    async verify2FA(code: string): Promise<Result<{ status: string; message: string }, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/super-admin/security/2fa/verify`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ code })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                success: true,
                data
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred')
            };
        }
    }

    async generateBackupCodes(): Promise<Result<{ backup_codes: string[] }, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/super-admin/security/2fa/backup-codes`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                success: true,
                data
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred')
            };
        }
    }

    // IP Allowlist Methods
    async getIPAllowlist(): Promise<Result<{ entries: SuperAdminIPAllowlistEntry[] }, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/super-admin/security/ip-allowlist`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                success: true,
                data
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred')
            };
        }
    }

    async addIPAllowlistEntry(entry: {
        ip_range: string;
        description: string;
        expires_at?: string;
    }): Promise<Result<SuperAdminIPAllowlistEntry, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/super-admin/security/ip-allowlist`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(entry)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                success: true,
                data
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred')
            };
        }
    }

    async removeIPAllowlistEntry(entryId: string): Promise<Result<void, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/super-admin/security/ip-allowlist/${entryId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
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

    // Emergency Controls Methods
    async getEmergencyLockouts(): Promise<Result<{ lockouts: SuperAdminEmergencyLockout[] }, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/super-admin/security/emergency/lockouts`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                success: true,
                data
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred')
            };
        }
    }

    async createEmergencyLockout(lockout: {
        reason: string;
        message: string;
        duration_hours?: number;
        allow_read_only: boolean;
    }): Promise<Result<SuperAdminEmergencyLockout, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/super-admin/security/emergency/lockout`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(lockout)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                success: true,
                data
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred')
            };
        }
    }

    async deactivateEmergencyLockout(lockoutId: string): Promise<Result<void, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/super-admin/security/emergency/lockout/${lockoutId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
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

    // Audit Logs Methods
    async getAuditLogs(params?: {
        limit?: number;
        offset?: number;
        action?: string;
    }): Promise<Result<{ logs: SuperAdminAuditLog[] }, Error>> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            if (params?.offset) queryParams.append('offset', params.offset.toString());
            if (params?.action) queryParams.append('action', params.action);

            const url = `${this.baseUrl}/api/admin/super-admin/security/audit-logs${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                success: true,
                data
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Unknown error occurred')
            };
        }
    }
}

export const superAdminSecurityService = new SuperAdminSecurityService();