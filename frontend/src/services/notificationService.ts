import axios from 'axios';
import { API_BASE_URL } from '../config';

export interface NotificationConfig {
  enabled: boolean;
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    in_app: boolean;
  };
}

export interface NotificationPreferences {
  user_id: string;
  tenant_id: string;
  account_updates: NotificationConfig;
  order_updates: NotificationConfig;
  marketing: NotificationConfig;
  security: NotificationConfig;
  seller_verification: NotificationConfig;
  team_invitations: NotificationConfig;
}

export interface SendNotificationRequest {
  recipient_id: string;
  notification_type: string;
  channels?: string[];
  subject?: string;
  message: string;
  template_id?: string;
  template_data?: Record<string, any>;
  metadata?: Record<string, any>;
  scheduled_at?: string;
}

export interface NotificationTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: string;
  channels: string[];
  subject_template?: string;
  body_template: string;
  created_at: string;
  updated_at?: string;
}

// Get notification preferences for the current user
export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
  const response = await axios.get(`${API_BASE_URL}/v1/notifications/preferences`);
  return response.data;
};

// Update notification preferences
export const updateNotificationPreferences = async (
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> => {
  const response = await axios.patch(
    `${API_BASE_URL}/v1/notifications/preferences`,
    preferences
  );
  return response.data;
};

// Send a notification
export const sendNotification = async (
  notification: SendNotificationRequest
): Promise<{ success: boolean; notification_id: string }> => {
  const response = await axios.post(
    `${API_BASE_URL}/v1/notifications/send`,
    notification
  );
  return response.data;
};

// Get notification templates
export const getNotificationTemplates = async (
  type?: string
): Promise<NotificationTemplate[]> => {
  const params: Record<string, any> = {};
  if (type) params.type = type;
  
  const response = await axios.get(`${API_BASE_URL}/v1/notifications/templates`, {
    params
  });
  return response.data;
};

// Send verification status notification
export const sendVerificationStatusNotification = async (
  sellerId: string,
  verificationType: string,
  newStatus: string,
  message?: string
): Promise<{ success: boolean; notification_id: string }> => {
  const templateData = {
    verification_type: verificationType,
    status: newStatus,
    message: message || '',
  };

  const notificationRequest: SendNotificationRequest = {
    recipient_id: sellerId,
    notification_type: 'seller_verification_status_update',
    channels: ['email', 'sms'],
    subject: `Verification Status Update: ${verificationType}`,
    message: message || `Your ${verificationType} verification status has been updated to ${newStatus}`,
    template_id: 'seller_verification_status_update',
    template_data: templateData
  };

  return sendNotification(notificationRequest);
};

// Send seller approval notification
export const sendSellerApprovalNotification = async (
  sellerId: string,
  message?: string
): Promise<{ success: boolean; notification_id: string }> => {
  const templateData = {
    message: message || '',
  };

  const notificationRequest: SendNotificationRequest = {
    recipient_id: sellerId,
    notification_type: 'seller_approval',
    channels: ['email', 'sms', 'in_app'],
    subject: 'Congratulations! Your Seller Application Has Been Approved',
    message: message || 'Your seller application has been approved. You can now start selling on our platform.',
    template_id: 'seller_approval',
    template_data: templateData
  };

  return sendNotification(notificationRequest);
};

// Send request for additional information notification
export const sendAdditionalInfoRequestNotification = async (
  sellerId: string,
  verificationType: string,
  requestDetails: string
): Promise<{ success: boolean; notification_id: string }> => {
  const templateData = {
    verification_type: verificationType,
    request_details: requestDetails
  };

  const notificationRequest: SendNotificationRequest = {
    recipient_id: sellerId,
    notification_type: 'seller_verification_info_request',
    channels: ['email', 'sms'],
    subject: `Additional Information Required: ${verificationType} Verification`,
    message: `Additional information is required for your ${verificationType} verification: ${requestDetails}`,
    template_id: 'seller_verification_info_request',
    template_data: templateData
  };

  return sendNotification(notificationRequest);
};

// Send verification rejection notification
export const sendRejectionNotification = async (
  sellerId: string,
  verificationType: string,
  rejectionReason: string
): Promise<{ success: boolean; notification_id: string }> => {
  const templateData = {
    verification_type: verificationType,
    rejection_reason: rejectionReason
  };

  const notificationRequest: SendNotificationRequest = {
    recipient_id: sellerId,
    notification_type: 'seller_verification_rejected',
    channels: ['email', 'sms'],
    subject: `Verification Rejected: ${verificationType}`,
    message: `Your ${verificationType} verification has been rejected: ${rejectionReason}`,
    template_id: 'seller_verification_rejected',
    template_data: templateData
  };

  return sendNotification(notificationRequest);
};
