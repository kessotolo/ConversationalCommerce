import { logConversationEvent } from '@/lib/api/conversationEvent';
import type { ConversationEvent } from '@/modules/conversation/models/event';

/**
 * Utility for logging conversation events from the frontend.
 * Usage: await ConversationEventLogger.log({ ... });
 */
export class ConversationEventLogger {
  /**
   * Log a conversation event to the backend.
   */
  static async log(event: Omit<ConversationEvent, 'id' | 'created_at'>): Promise<void> {
    try {
      await logConversationEvent(event);
    } catch (err) {
      // Optionally, report to monitoring or show a non-blocking error

      console.warn('Failed to log conversation event', err);
    }
  }
}
