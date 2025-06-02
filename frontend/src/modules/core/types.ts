// Public types for core module. Do not import from models/ in other modules; import from this file.

/**
 * Event Types
 *
 * These types were previously defined in the bridge pattern file @/types/events.ts
 * They are now properly housed within the core module as part of our modular monolith architecture.
 */

export type UUID = string;

export interface Entity {
  id: UUID;
  created_at: string;
  updated_at?: string;
}

export interface TenantScoped extends Entity {
  tenant_id: UUID;
}

export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

export interface Money {
  amount: number;
  currency: string;
}

export interface PaginationParams {
  skip?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Two shapes for PaginatedResult exist; unify here for public API
export interface PaginatedResult<T> {
  items?: T[];
  data?: T[];
  total?: number;
  skip?: number;
  limit?: number;
  meta?: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  };
  links?: {
    first?: string;
    last?: string;
    prev?: string | null;
    next?: string | null;
  };
}

export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted',
  PENDING = 'pending',
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  SCHEDULED = 'scheduled',
}

export interface ApplicationError extends Error {
  code: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export interface AuditInfo {
  created_by: UUID;
  created_at: string;
  updated_by?: UUID;
  updated_at?: string;
}

export interface Draftable extends Entity, AuditInfo {
  status: Status;
  published_at?: string;
  published_by?: UUID;
}

export interface FilterOption<T = unknown> {
  id: string;
  label: string;
  value: T;
}

export interface FilterGroup<T = unknown> {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'range' | 'boolean';
  options?: FilterOption<T>[];
  defaultValue?: T;
}

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
  type?: 'billing' | 'shipping' | 'both';
}

export interface BaseDetails {
  [key: string]: unknown;
}

export interface BaseModel<T> {
  value: T;
  defaultValue?: T;
  details?: BaseDetails;
}

/**
 * Common Event Types for React form handling
 */
export type InputChangeEvent = React.ChangeEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>;
export type FormSubmitEvent = React.FormEvent<HTMLFormElement>;

/**
 * WebSocket Types
 *
 * These types were previously defined in the bridge pattern file @/types/websocket.ts
 * They are now properly housed within the core module as part of our modular monolith architecture.
 */
export interface WebSocketMessage {
  type: string;
  payload: unknown;
}

export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
}

// Type guard for notification payloads
export function isNotification(
  message: WebSocketMessage,
): message is WebSocketMessage & { payload: NotificationPayload } {
  return (
    message.type === 'notification' &&
    message.payload !== null &&
    typeof message.payload === 'object'
  );
}
