import type { UUID, Entity } from '@/modules/core';

export interface IPAllowlistEntry extends Entity {
    ip_address: string;
    description: string;
    is_active: boolean;
    created_by: UUID;
    expires_at?: string;
}

export interface TwoFactorAuth {
    user_id: UUID;
    is_enabled: boolean;
    secret: string;
    backup_codes: string[];
    last_used: string | null;
    created_at: string;
}

export interface SecurityAuditLog extends Entity {
    user_id: UUID;
    action: SecurityAction;
    resource: string;
    ip_address: string;
    user_agent: string;
    success: boolean;
    details: Record<string, unknown>;
    timestamp: string;
}

export enum SecurityAction {
    LOGIN = 'login',
    LOGOUT = 'logout',
    FAILED_LOGIN = 'failed_login',
    PASSWORD_CHANGE = 'password_change',
    TWO_FACTOR_ENABLE = 'two_factor_enable',
    TWO_FACTOR_DISABLE = 'two_factor_disable',
    IP_ALLOWLIST_ADD = 'ip_allowlist_add',
    IP_ALLOWLIST_REMOVE = 'ip_allowlist_remove',
    ADMIN_ACCESS = 'admin_access',
    TENANT_ACCESS = 'tenant_access',
    SECURITY_SETTING_CHANGE = 'security_setting_change'
}

export interface SecuritySettings {
    enforce_2fa: boolean;
    enforce_ip_allowlist: boolean;
    session_timeout_minutes: number;
    max_failed_login_attempts: number;
    lockout_duration_minutes: number;
    require_password_change_days: number;
    audit_log_retention_days: number;
}