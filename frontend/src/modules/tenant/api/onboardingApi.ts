import type { UUID } from '@/modules/core/models/base';

// --- Types matching backend schemas ---
export interface OnboardingStartRequest {
  business_name: string;
  phone: string;
  email?: string;
  subdomain: string;
}
export interface OnboardingStartResponse {
  status: string;
  message: string;
  tenant_id: UUID;
}
export interface KYCRequest {
  tenant_id: UUID;
  business_name: string;
  id_number: string;
  id_type: string;
}
export interface KYCResponse {
  status: string;
  kyc_id: UUID;
  message?: string;
}
export interface DomainRequest {
  tenant_id: UUID;
  domain: string;
}
export interface DomainResponse {
  status: string;
  message: string;
  domain: string;
}
export interface TeamInviteRequest {
  tenant_id: UUID;
  invitee_phone: string;
  role: string;
}
export interface TeamInviteResponse {
  status: string;
  invite_link: string;
}
export interface KYCUploadResponse {
  status: string;
  message?: string;
  file_url?: string;
}
export interface OnboardingStatusResponse {
  business_info_complete: boolean;
  kyc_complete: boolean;
  kyc_upload_complete: boolean;
  domain_complete: boolean;
  team_invite_complete: boolean;
  overall_complete: boolean;
  current_step?: string;
  message?: string;
}
export interface KYCReviewRequest {
  kyc_id: UUID;
  action: 'approve' | 'reject';
}
export interface KYCInfoResponse {
  id: UUID;
  tenant_id: UUID;
  business_name: string;
  id_number: string;
  id_type: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

// --- API functions for onboarding flows ---
export const onboardingApi = {
  startOnboarding: async (
    data: OnboardingStartRequest,
    token: string,
  ): Promise<OnboardingStartResponse> => {
    const res = await fetch('/api/v1/onboarding/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await getErrorMsg(res));
    return res.json();
  },
  submitKYC: async (data: KYCRequest, token: string): Promise<KYCResponse> => {
    const res = await fetch('/api/v1/onboarding/kyc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await getErrorMsg(res));
    return res.json();
  },
  setDomain: async (data: DomainRequest, token: string): Promise<DomainResponse> => {
    const res = await fetch('/api/v1/onboarding/domain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await getErrorMsg(res));
    return res.json();
  },
  inviteTeam: async (data: TeamInviteRequest, token: string): Promise<TeamInviteResponse> => {
    const res = await fetch('/api/v1/onboarding/team-invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await getErrorMsg(res));
    return res.json();
  },
  uploadKYCFile: async (kyc_id: UUID, file: File, token: string): Promise<KYCUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    // kyc_id is sent as query param
    const res = await fetch(`/api/v1/onboarding/upload-doc?kyc_id=${kyc_id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!res.ok) throw new Error(await getErrorMsg(res));
    return res.json();
  },
  getStatus: async (token: string): Promise<OnboardingStatusResponse> => {
    const res = await fetch('/api/v1/onboarding/status', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error(await getErrorMsg(res));
    return res.json();
  },
  listKYCRequests: async (token: string): Promise<KYCInfoResponse[]> => {
    const res = await fetch('/api/v1/admin/kyc-requests', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error(await getErrorMsg(res));
    return res.json();
  },
  reviewKYC: async (data: KYCReviewRequest, token: string): Promise<KYCInfoResponse> => {
    const res = await fetch('/api/v1/onboarding/kyc/review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await getErrorMsg(res));
    return res.json();
  },
};

// --- Domain validation (call backend or fallback to simple check) ---
export const validateDomain = async (
  domain: string
): Promise<{ available: boolean; message: string }> => {
  // TODO: Replace with real backend endpoint if available
  if (!domain || domain.length < 3) return { available: false, message: 'Domain too short' };
  if (['taken', 'admin', 'shop'].includes(domain.toLowerCase()))
    return { available: false, message: 'Domain is already taken' };
  return { available: true, message: 'Domain is available' };
};

// --- Send invite email (if backend supports) ---
export const sendInviteEmail = async (): Promise<{ status: string }> => {
  // TODO: Implement if backend supports
  return { status: 'success' };
};

// --- Helper to extract error message from fetch Response ---
async function getErrorMsg(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.detail || data.message || res.statusText;
  } catch {
    return res.statusText;
  }
}
