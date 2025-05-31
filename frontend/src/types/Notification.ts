// Notification type definitions
// Using UUID type for ID fields as per project standardization
// Removed circular import
// Removed circular import;

export interface Notification {
  id: string; // UUID
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
  relatedEntityId?: string; // UUID if present
  relatedEntityType?: 'order' | 'product' | 'customer' | 'message';
}

export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  push: boolean;
  sms: boolean;
  orderUpdates: boolean;
  productUpdates: boolean;
  customerMessages: boolean;
  marketingUpdates: boolean;
  systemAlerts: boolean;
}

export interface NotificationFilter {
  type?: 'info' | 'success' | 'warning' | 'error';
  read?: boolean;
  relatedEntityType?: 'order' | 'product' | 'customer' | 'message';
  startDate?: string;
  endDate?: string;
}
