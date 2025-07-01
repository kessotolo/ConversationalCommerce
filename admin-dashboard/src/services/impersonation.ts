/**
 * Super Admin impersonation service.
 * 
 * This module provides client-side functionality for super admins to impersonate tenant owners.
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface ImpersonationResponse {
  token: string;
  expires_in: number;
  tenant: {
    id: string;
    name: string;
    subdomain: string;
    custom_domain: string | null;
    impersonation_url: string;
  };
}

interface VerifyResponse {
  valid: boolean;
  tenant_id?: string;
  admin_user_id?: string;
  expires_at?: number;
  tenant?: {
    id: string;
    name: string;
    subdomain: string;
  };
  error?: string;
}

/**
 * Create an impersonation token for a tenant
 * 
 * @param tenantId - ID of the tenant to impersonate
 * @param token - Admin authentication token
 * @returns Impersonation response with token and tenant info
 */
export const createImpersonationToken = async (
  tenantId: string,
  token: string
): Promise<ImpersonationResponse> => {
  try {
    const response = await axios.post(
      `${API_URL}/admin/impersonation/token/${tenantId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error creating impersonation token:', error);
    throw new Error('Failed to create impersonation token');
  }
};

/**
 * Verify an impersonation token
 * 
 * @param token - Impersonation token to verify
 * @returns Verification result
 */
export const verifyImpersonationToken = async (token: string): Promise<VerifyResponse> => {
  try {
    const response = await axios.post(
      `${API_URL}/admin/impersonation/verify`,
      { token }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error verifying impersonation token:', error);
    return { valid: false, error: 'Failed to verify impersonation token' };
  }
};

/**
 * End an impersonation session
 * 
 * @param token - Impersonation token to end
 * @returns Success message
 */
export const endImpersonation = async (token: string): Promise<{ message: string }> => {
  try {
    const response = await axios.post(
      `${API_URL}/admin/impersonation/end`,
      { token }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error ending impersonation session:', error);
    throw new Error('Failed to end impersonation session');
  }
};

/**
 * Start impersonation and redirect to tenant storefront
 * 
 * @param tenantId - ID of the tenant to impersonate
 * @param adminToken - Admin authentication token
 */
export const startImpersonation = async (tenantId: string, adminToken: string): Promise<void> => {
  try {
    // Create impersonation token
    const impersonation = await createImpersonationToken(tenantId, adminToken);
    
    // Store impersonation token in session storage for audit trail
    sessionStorage.setItem('impersonationToken', impersonation.token);
    sessionStorage.setItem('impersonationTenantId', tenantId);
    
    // Redirect to impersonation URL
    window.location.href = impersonation.tenant.impersonation_url;
  } catch (error) {
    console.error('Error starting impersonation:', error);
    throw new Error('Failed to start impersonation');
  }
};

/**
 * Handle impersonation on tenant storefront
 * 
 * This function should be called on the tenant storefront when an impersonation token is present in the URL
 * 
 * @param token - Impersonation token from URL
 * @returns Verification result
 */
export const handleImpersonation = async (token: string): Promise<VerifyResponse> => {
  try {
    // Verify token
    const verification = await verifyImpersonationToken(token);
    
    if (verification.valid) {
      // Store impersonation info in session storage
      sessionStorage.setItem('impersonationActive', 'true');
      sessionStorage.setItem('impersonationToken', token);
      sessionStorage.setItem('impersonationTenantId', verification.tenant_id!);
      sessionStorage.setItem('impersonationAdminId', verification.admin_user_id!);
      
      // Return verification result
      return verification;
    }
    
    return verification;
  } catch (error) {
    console.error('Error handling impersonation:', error);
    return { valid: false, error: 'Failed to handle impersonation' };
  }
};

/**
 * Check if current session is an impersonation
 * 
 * @returns True if current session is an impersonation
 */
export const isImpersonationActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('impersonationActive') === 'true';
};

/**
 * End current impersonation and redirect to admin dashboard
 */
export const endCurrentImpersonation = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  try {
    // Get impersonation token
    const token = sessionStorage.getItem('impersonationToken');
    if (!token) return;
    
    // End impersonation session
    await endImpersonation(token);
    
    // Clear impersonation data
    sessionStorage.removeItem('impersonationActive');
    sessionStorage.removeItem('impersonationToken');
    sessionStorage.removeItem('impersonationTenantId');
    sessionStorage.removeItem('impersonationAdminId');
    
    // Redirect to admin dashboard
    const adminDomain = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || 'admin.yourplatform.com';
    window.location.href = `https://${adminDomain}`;
  } catch (error) {
    console.error('Error ending current impersonation:', error);
  }
};

// Export the service as a default object
export default {
  createImpersonationToken,
  verifyImpersonationToken,
  endImpersonation,
  startImpersonation,
  handleImpersonation,
  isImpersonationActive,
  endCurrentImpersonation
};
