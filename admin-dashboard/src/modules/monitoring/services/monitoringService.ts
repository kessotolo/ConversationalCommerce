import type { ApiResponse, Result } from '@/modules/core';
import type { ConversationAnalytics, SystemHealth, SecurityStatus } from '../models/conversation';

class MonitoringService {
    private readonly baseUrl: string;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    }

    async getConversationAnalytics(
        dateRange?: { start: string; end: string }
    ): Promise<Result<ConversationAnalytics, Error>> {
        try {
            const params = new URLSearchParams();
            if (dateRange) {
                params.append('start_date', dateRange.start);
                params.append('end_date', dateRange.end);
            }

            const response = await fetch(`${this.baseUrl}/api/admin/conversation-analytics?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: ApiResponse<ConversationAnalytics> = await response.json();

            if (!data.success || !data.data) {
                throw new Error(data.error || 'Failed to fetch analytics');
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

    async getSystemHealth(): Promise<Result<SystemHealth, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/system-health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: ApiResponse<SystemHealth> = await response.json();

            if (!data.success || !data.data) {
                throw new Error(data.error || 'Failed to fetch system health');
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

    async getSecurityStatus(): Promise<Result<SecurityStatus, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/security-status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: ApiResponse<SecurityStatus> = await response.json();

            if (!data.success || !data.data) {
                throw new Error(data.error || 'Failed to fetch security status');
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

    private getAuthToken(): string {
        // This will be replaced with proper Clerk integration
        return typeof window !== 'undefined' ?
            localStorage.getItem('auth_token') || '' : '';
    }
}

export const monitoringService = new MonitoringService();