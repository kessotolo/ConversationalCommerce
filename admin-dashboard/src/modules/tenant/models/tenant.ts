import type { UUID, Entity, Status } from '@/modules/core';

export interface Tenant extends Entity {
    name: string;
    domain: string;
    subdomain: string;
    status: Status;
    plan: 'starter' | 'professional' | 'enterprise';
    owner_id: UUID;
    settings: TenantSettings;
    metrics: TenantMetrics;
}

export interface TenantSettings {
    whatsapp_enabled: boolean;
    instagram_enabled: boolean;
    web_enabled: boolean;
    sms_enabled: boolean;
    ai_assistant_enabled: boolean;
    custom_branding: boolean;
    max_products: number;
    max_conversations: number;
}

export interface TenantMetrics {
    total_conversations: number;
    total_orders: number;
    total_revenue: number;
    active_users: number;
    conversion_rate: number;
    average_order_value: number;
    last_activity: string;
}

export interface TenantUser extends Entity {
    tenant_id: UUID;
    user_id: UUID;
    email: string;
    name: string;
    role: 'owner' | 'admin' | 'manager' | 'agent';
    permissions: string[];
    last_login: string;
    is_active: boolean;
}