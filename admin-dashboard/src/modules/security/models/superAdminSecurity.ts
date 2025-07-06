import type { UUID, Entity } from '@/modules/core';

// Two-Factor Authentication Types
export interface SuperAdminTOTPStatus {
    is_enabled: boolean;
    is_required: boolean;
}

export interface SuperAdminTOTPSetup {
    secret: string;
    qr_code_uri: string;
    backup_codes: string[];
    totp_record_id: string;
}

export interface SuperAdminTOTPRequirement {
    id: string;
    is_required: boolean;
    role_id?: string;
    tenant_id?: string;
    grace_period_days: number;
    created_at: string;
    updated_at: string;
}

// IP Allowlist Types
export interface SuperAdminIPAllowlistEntry extends Entity {
    ip_range: string;
    description?: string;
    is_active: boolean;
    expires_at?: string;
    created_by: UUID;
}

export interface SuperAdminIPAllowlistRequest {
    ip_range: string;
    description?: string;
    expires_at?: string;
}

// Emergency Controls Types
export interface SuperAdminEmergencyLockout extends Entity {
    is_platform_wide: boolean;
    reason: string;
    message: string;
    is_active: boolean;
    allow_read_only: boolean;
    expires_at?: string;
    created_by: UUID;
    deactivated_at?: string;
    deactivated_by?: UUID;
}

export interface SuperAdminEmergencyLockoutRequest {
    reason: string;
    message: string;
    duration_hours?: number;
    allow_read_only: boolean;
}

// Audit Log Types
export interface SuperAdminAuditLog extends Entity {
    user_id?: UUID;
    ip_address?: string;
    user_agent?: string;
    timestamp: string;
    action: string;
    status: 'success' | 'error' | 'blocked';
    resource_type: string;
    resource_id?: string;
    tenant_id?: UUID;
    details?: Record<string, unknown>;
    message?: string;
}

// Security Actions Enum
export enum SuperAdminSecurityAction {
    // 2FA Actions
    TOTP_SETUP = 'totp_setup',
    TOTP_VERIFIED = 'totp_verified',
    TOTP_VERIFICATION_FAILED = 'totp_verification_failed',
    TOTP_DISABLED = 'totp_disabled',
    BACKUP_CODE_USED = 'backup_code_used',
    BACKUP_CODE_FAILED = 'backup_code_failed',
    BACKUP_CODES_REGENERATED = 'backup_codes_regenerated',
    TOTP_REQUIREMENT_SET = 'totp_requirement_set',

    // IP Allowlist Actions
    IP_ALLOWLIST_ENTRY_ADDED = 'ip_allowlist_entry_added',
    IP_ALLOWLIST_ENTRY_REMOVED = 'ip_allowlist_entry_removed',
    IP_ALLOWLIST_ENTRY_UPDATED = 'ip_allowlist_entry_updated',
    IP_BLOCKED = 'ip_blocked',
    IP_ALLOWED = 'ip_allowed',

    // Emergency Actions
    EMERGENCY_LOCKOUT_CREATED = 'emergency_lockout_created',
    EMERGENCY_LOCKOUT_DEACTIVATED = 'emergency_lockout_deactivated',
    EMERGENCY_ACCESS_GRANTED = 'emergency_access_granted',
    EMERGENCY_ACCESS_DENIED = 'emergency_access_denied',

    // Rate Limiting Actions
    RATE_LIMITED = 'rate_limited',
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',

    // Security Events
    SECURITY_EVENT_DETECTED = 'security_event_detected',
    MIDDLEWARE_ERROR = 'middleware_error',
    UNAUTHORIZED_ACCESS_ATTEMPT = 'unauthorized_access_attempt',

    // Admin Actions
    ADMIN_LOGIN = 'admin_login',
    ADMIN_LOGOUT = 'admin_logout',
    ADMIN_ACCESS = 'admin_access',
    ADMIN_ACTION_PERFORMED = 'admin_action_performed'
}

// Security Settings Types
export interface SuperAdminSecuritySettings {
    enforce_2fa: boolean;
    enforce_ip_allowlist: boolean;
    session_timeout_minutes: number;
    max_failed_login_attempts: number;
    lockout_duration_minutes: number;
    require_password_change_days: number;
    audit_log_retention_days: number;
    enable_emergency_controls: boolean;
    enable_rate_limiting: boolean;
    max_requests_per_minute: number;
}

// Security Dashboard Summary Types
export interface SuperAdminSecuritySummary {
    total_active_sessions: number;
    total_ip_allowlist_entries: number;
    total_active_lockouts: number;
    recent_security_events: number;
    totp_enabled_admins: number;
    total_super_admins: number;
    last_security_incident?: string;
    system_security_score: number; // 0-100
}

// Security Event Types
export interface SuperAdminSecurityEvent {
    id: string;
    type: SuperAdminSecurityAction;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    user_id?: UUID;
    ip_address?: string;
    timestamp: string;
    resolved: boolean;
    resolved_at?: string;
    resolved_by?: UUID;
    details: Record<string, unknown>;
}

// Rate Limiting Types
export interface SuperAdminRateLimitRule {
    id: string;
    name: string;
    endpoint?: string;
    requests_per_second?: number;
    requests_per_minute?: number;
    requests_per_hour?: number;
    block_duration_seconds: number;
    is_active: boolean;
    applies_to_admins: boolean;
    created_at: string;
    updated_at: string;
}

export interface SuperAdminRateLimitViolation {
    id: string;
    ip_address: string;
    user_id?: UUID;
    rule_id: string;
    request_count: number;
    is_blocked: boolean;
    window_start: string;
    expires_at: string;
    path?: string;
    details?: Record<string, unknown>;
}

// API Response Types
export interface SuperAdminSecurityApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Form Types for UI Components
export interface SuperAdmin2FASetupForm {
    verification_code: string;
}

export interface SuperAdminIPAllowlistForm {
    ip_range: string;
    description: string;
    expires_at?: string;
}

export interface SuperAdminEmergencyLockoutForm {
    reason: string;
    message: string;
    duration_hours?: number;
    allow_read_only: boolean;
}

export interface SuperAdminSecuritySettingsForm {
    enforce_2fa: boolean;
    enforce_ip_allowlist: boolean;
    session_timeout_minutes: number;
    max_failed_login_attempts: number;
    lockout_duration_minutes: number;
    require_password_change_days: number;
    audit_log_retention_days: number;
    enable_emergency_controls: boolean;
    enable_rate_limiting: boolean;
    max_requests_per_minute: number;
}