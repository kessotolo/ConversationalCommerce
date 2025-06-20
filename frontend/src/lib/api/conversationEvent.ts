import type { ConversationEvent } from '@/modules/conversation/models/event';

const API_BASE = '/api/conversation-events';

/**
 * Log a conversation event to the backend.
 */
export async function logConversationEvent(
  event: Omit<ConversationEvent, 'id' | 'created_at'>,
): Promise<ConversationEvent> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    throw new Error(`Failed to log event: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Retrieve all conversation events (for analytics, admin, etc).
 */
export async function getConversationEvents(): Promise<ConversationEvent[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) {
    throw new Error(`Failed to fetch events: ${res.statusText}`);
  }
  return res.json();
}
