import axios from 'axios';
import { API_BASE_URL } from '../config';

export interface UserProfile {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  phone?: string;
  created_at: string;
  updated_at?: string;
  is_active: boolean;
  role: string;
  last_login_at?: string;
}

export interface ProfileUpdateRequest {
  name: string;
  email: string;
  phone?: string;
  current_password?: string;
  new_password?: string;
}

export interface SecuritySettings {
  two_factor_enabled: boolean;
  login_notification_enabled: boolean;
  password_last_changed_at?: string;
  recent_logins: {
    timestamp: string;
    ip_address: string;
    device: string;
    location?: string;
  }[];
}

// Get the current user profile
export const getUserProfile = async (): Promise<UserProfile> => {
  const response = await axios.get(`${API_BASE_URL}/v1/users/me`);
  return response.data;
};

// Update user profile
export const updateUserProfile = async (profile: ProfileUpdateRequest): Promise<UserProfile> => {
  const response = await axios.patch(`${API_BASE_URL}/v1/users/me`, profile);
  return response.data;
};

// Get security settings
export const getSecuritySettings = async (): Promise<SecuritySettings> => {
  const response = await axios.get(`${API_BASE_URL}/v1/users/me/security`);
  return response.data;
};

// Update security settings
export const updateSecuritySettings = async (
  settings: Partial<SecuritySettings>
): Promise<SecuritySettings> => {
  const response = await axios.patch(`${API_BASE_URL}/v1/users/me/security`, settings);
  return response.data;
};

// Request password reset
export const requestPasswordReset = async (email: string): Promise<{ success: boolean }> => {
  const response = await axios.post(`${API_BASE_URL}/v1/auth/password-reset`, { email });
  return response.data;
};

// Validate password reset token
export const validatePasswordResetToken = async (
  token: string
): Promise<{ valid: boolean }> => {
  const response = await axios.get(`${API_BASE_URL}/v1/auth/password-reset/${token}/validate`);
  return response.data;
};

// Reset password with token
export const resetPassword = async (
  token: string, 
  new_password: string
): Promise<{ success: boolean }> => {
  const response = await axios.post(`${API_BASE_URL}/v1/auth/password-reset/${token}`, {
    new_password,
  });
  return response.data;
};
