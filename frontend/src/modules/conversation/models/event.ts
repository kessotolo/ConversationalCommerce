import type { UUID } from '@/modules/core/models/base';

/**
 * ConversationEvent Pattern
 * ------------------------
 * This file defines the ConversationEventType enum and ConversationEvent interface, which are used for analytics and monitoring.
 *
 * - When adding a new event type, update both this enum and the backend ConversationEventType (see backend/app/schemas/conversation_event.py and backend/app/models/conversation_event.py).
 * - All analytics and monitoring should use this pattern for extensibility and consistency.
 * - See AI_AGENT_CONFIG.md for more details.
 */

/**
 * Enum of all supported conversation event types.
 */
export enum ConversationEventType {
  MESSAGE_SENT = 'message_sent',
  MESSAGE_READ = 'message_read',
  PRODUCT_CLICKED = 'product_clicked',
  ORDER_PLACED = 'order_placed',
  CONVERSATION_STARTED = 'conversation_started',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  CONVERSATION_CLOSED = 'conversation_closed',
  // Onboarding-specific events
  ONBOARDING_STEP = 'onboarding_step',
  ONBOARDING_ERROR = 'onboarding_error',
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
