import type { UUID } from '@/modules/core/models/base';

/**
 * Enum of all supported conversation event types.
 */
export enum ConversationEventType {
  MESSAGE_SENT = 'message_sent',
  MESSAGE_READ = 'message_read',
  PRODUCT_CLICKED = 'product_clicked',
  ORDER_PLACED = 'order_placed',
  // Add more event types as needed
}

/**
 * ConversationEvent represents a single event in a conversation, for analytics and monitoring.
 */
export interface ConversationEvent {
  /** Unique event ID */
  id: UUID;
  /** Conversation ID (optional, for non-message events) */
  conversation_id?: UUID;
  /** User ID (optional, for system events) */
  user_id?: UUID;
  /** Event type */
  event_type: ConversationEventType;
  /** Arbitrary event data for extensibility */
  payload?: Record<string, unknown>;
  /** Tenant ID for multi-tenancy */
  tenant_id: UUID;
  /** Optional extra context (device info, etc.) */
  metadata?: Record<string, unknown>;
  /** Event creation timestamp (ISO string) */
  created_at: string;
}
