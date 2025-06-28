import { useUser, useOrganization } from '@clerk/nextjs';

import { ConversationEventType } from '@/modules/conversation/models/event';

import { ConversationEventLogger } from './eventLogger';

/**
 * Logs an ORDER_PLACED event for analytics and monitoring.
 * Call this after a successful order placement.
 *
 * @param orderId - The ID of the placed order
 * @param conversationId - The conversation ID (if applicable)
 * @param orderDetails - Any additional order details to include in the payload
 */
export async function logOrderPlacedEvent({
  orderId,
  conversationId,
  orderDetails = {},
}: {
  orderId: string;
  conversationId?: string;
  orderDetails?: Record<string, unknown>;
}) {
  // Clerk hooks must be used in a React component, so pass user/tenant IDs as arguments if calling from outside React
  // This utility is for use in client components/hooks
  const { user } = useUser();
  const { organization } = useOrganization();

  if (!user) throw new Error('User not authenticated');

  // Ensure tenant_id is always a string
  const tenantId =
    typeof organization?.id === 'string'
      ? organization.id
      : typeof user.publicMetadata?.tenantId === 'string'
        ? user.publicMetadata.tenantId
        : '';

  await ConversationEventLogger.log({
    conversation_id: conversationId,
    user_id: user.id,
    event_type: ConversationEventType.ORDER_PLACED,
    payload: { orderId, ...orderDetails },
    tenant_id: tenantId,
    metadata: {},
  });
}
