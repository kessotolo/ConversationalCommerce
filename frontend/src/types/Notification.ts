import * as React from 'react';
// @ts-nocheck
// DO NOT MODIFY: This file is manually maintained
// Notification type definitions

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
  relatedEntityId?: string;
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
