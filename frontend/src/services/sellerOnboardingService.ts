import axios from 'axios';
import { API_BASE_URL } from '../config';

export interface AdminDashboardStats {
  pending_verifications: number;
  in_review_verifications: number;
  approved_sellers: number;
  rejected_verifications: number;
  additional_info_needed: number;
  pending_identity: number;
  pending_business: number;
  pending_banking: number;
  pending_tax: number;
  pending_address: number;
}

export interface VerificationResponse {
  id: string;
  seller_id: string;
  tenant_id: string;
  verification_type: string;
  verification_data?: Record<string, any>;
  document_ids?: string[];
  notes?: string;
  status: string;
  reviewed_by?: string;
  rejection_reason?: string;
  additional_info_requested?: string;
  submitted_at: string;
  updated_at?: string;
  reviewed_at?: string;
}

export interface VerificationAdminUpdate {
  status: string;
  notes?: string;
  rejection_reason?: string;
  additional_info_requested?: string;
}

export interface OnboardingStatusResponse {
  id: string;
  seller_id: string;
  tenant_id: string;
  is_approved: boolean;
  is_identity_verified: boolean;
  is_business_verified: boolean;
  is_banking_verified: boolean;
  is_tax_verified: boolean;
  is_address_verified: boolean;
  completed_steps: string[];
  current_step?: string;
  started_at: string;
  updated_at?: string;
  completed_at?: string;
  verifications?: VerificationResponse[];
}

// Get dashboard statistics
export const getSellerDashboardStats = async (): Promise<AdminDashboardStats> => {
  const response = await axios.get(`${API_BASE_URL}/v1/admin/seller-review/dashboard/stats`);
  return response.data;
};

// Get all verifications with optional filters
export const getVerifications = async (
  status?: string,
  verificationType?: string,
  limit: number = 10,
  offset: number = 0
): Promise<VerificationResponse[]> => {
  let url = `${API_BASE_URL}/v1/admin/seller-review/verifications`;
  const params: Record<string, any> = { limit, offset };
  
  if (status) params.status = status;
  if (verificationType) params.verification_type = verificationType;
  
  const response = await axios.get(url, { params });
  return response.data;
};

// Get verification details
export const getVerificationDetails = async (id: string): Promise<VerificationResponse> => {
  const response = await axios.get(`${API_BASE_URL}/v1/admin/seller-review/verifications/${id}`);
  return response.data;
};

// Update verification status
export const updateVerificationStatus = async (
  id: string,
  update: VerificationAdminUpdate
): Promise<VerificationResponse> => {
  const response = await axios.patch(
    `${API_BASE_URL}/v1/admin/seller-review/verifications/${id}`, 
    update
  );
  return response.data;
};

// Get seller onboarding status
export const getSellerOnboardingStatus = async (
  sellerId: string
): Promise<OnboardingStatusResponse> => {
  const response = await axios.get(
    `${API_BASE_URL}/v1/admin/seller-review/sellers/${sellerId}`
  );
  return response.data;
};

// Approve seller
export const approveSeller = async (
  sellerId: string
): Promise<OnboardingStatusResponse> => {
  const response = await axios.post(
    `${API_BASE_URL}/v1/admin/seller-review/sellers/${sellerId}/approve`
  );
  return response.data;
};
