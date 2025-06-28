export * from './base';
export type { PaginatedResult as PaginatedResultBase } from './base'; // Simple paginated result
export type { PaginatedResult } from './pagination'; // API-style paginated result
export * from './events';

// Temporary stubs for NotificationPayload and isNotification
export type NotificationPayload = {
  title: string;
  message: string;
  [key: string]: unknown;
};
export function isNotification(payload: unknown): payload is NotificationPayload {
  return (
    typeof payload === 'object' && payload !== null && 'title' in payload && 'message' in payload
  );
}
