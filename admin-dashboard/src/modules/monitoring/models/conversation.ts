import type { UUID, Entity } from '@/modules/core';

export enum ConversationEventType {
    MESSAGE_SENT = 'message_sent',
    MESSAGE_READ = 'message_read',
    PRODUCT_CLICKED = 'product_clicked',
    ORDER_PLACED = 'order_placed',
    CONVERSATION_STARTED = 'conversation_started',
    USER_JOINED = 'user_joined',
    USER_LEFT = 'user_left',
    CONVERSATION_CLOSED = 'conversation_closed',
    CART_UPDATED = 'cart_updated',
    PAYMENT_INITIATED = 'payment_initiated',
    PAYMENT_COMPLETED = 'payment_completed'
}

export interface ConversationEvent extends Entity {
    conversation_id: UUID;
    user_id: UUID;
    tenant_id: UUID;
    event_type: ConversationEventType;
    payload: Record<string, unknown>;
    event_metadata: {
        platform: 'whatsapp' | 'instagram' | 'web' | 'sms';
        channel: string;
        response_time_ms?: number;
        message_length?: number;
        contains_product?: boolean;
        contains_order?: boolean;
    };
}

export interface ConversationAnalytics {
    total_events: number;
    events_by_type: Record<ConversationEventType, number>;
    events_by_day: Array<{
        date: string;
        count: number;
    }>;
    average_response_time: number;
    conversion_rate: number;
    active_conversations: number;
    platform_breakdown: Record<string, number>;
}

export interface SystemHealth {
    status: 'healthy' | 'degraded' | 'down';
    uptime: number;
    response_time: number;
    active_connections: number;
    error_rate: number;
    last_updated: string;
}

export interface SecurityStatus {
    staff_access_enabled: boolean;
    ip_allowlist_active: boolean;
    two_factor_enabled: boolean;
    audit_logging_active: boolean;
    failed_login_attempts: number;
    suspicious_activity_detected: boolean;
}