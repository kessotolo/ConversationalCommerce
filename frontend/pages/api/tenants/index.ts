import type { NextApiRequest, NextApiResponse } from 'next';

type TenantRequest = {
  storeName: string;
  businessName: string;
  phoneNumber: string;
  storeEmail: string;
  category: string;
  subdomain: string;
  userId: string;
};

type TenantResponse = {
  id: string;
  subdomain: string;
  customDomain?: string;
  name: string;
  createdAt: string;
};

type ErrorResponse = {
  error: string;
  message: string;
};

/**
 * API endpoint to create a new tenant (store) for a user
 * 
 * This creates the tenant record, initializes with default theme,
 * and associates it with the authenticated user
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TenantResponse | ErrorResponse>
) {
  // Only allow POST for tenant creation
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method Not Allowed', 
      message: 'Only POST requests are supported' 
    });
  }

  try {
    const {
      storeName,
      businessName,
      phoneNumber,
      storeEmail,
      category,
      subdomain,
      userId,
    } = req.body as TenantRequest;

    // Validate required fields
    if (!storeName || !businessName || !phoneNumber || !subdomain || !userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields'
      });
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid subdomain format'
      });
    }

    // Check if subdomain is available
    // This would typically be an API call to your backend
    // For now, we'll mock this check
    const isSubdomainAvailable = await checkSubdomainAvailability(subdomain);
    
    if (!isSubdomainAvailable) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Subdomain is already taken'
      });
    }

    // Create tenant in backend
    // This would be an actual API call to your backend service
    const tenant = await createTenant({
      storeName,
      businessName,
      phoneNumber,
      storeEmail,
      category,
      subdomain,
      userId,
    });

    // Return created tenant
    return res.status(201).json({
      id: tenant.id,
      subdomain: tenant.subdomain,
      customDomain: tenant.customDomain,
      name: tenant.name,
      createdAt: tenant.createdAt,
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create tenant'
    });
  }
}

// Mock function to check subdomain availability
// In production, this would call your backend API
async function checkSubdomainAvailability(subdomain: string): Promise<boolean> {
  // Simulate API call with a short delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Mock database check - in production this would be a real check
  const takenSubdomains = ['test', 'admin', 'api', 'app', 'demo', 'dev', 'staging'];
  return !takenSubdomains.includes(subdomain);
}

// Mock function to create a tenant
// In production, this would call your backend API
async function createTenant(data: TenantRequest): Promise<TenantResponse & { customDomain?: string }> {
  // Simulate API call with a short delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Generate a UUID for the new tenant
  const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  
  // In production, this would create:
  // 1. A Tenant record
  // 2. A default StorefrontTheme linked to the tenant
  // 3. Association between the user and tenant
  
  return {
    id,
    subdomain: data.subdomain,
    name: data.storeName,
    createdAt: new Date().toISOString(),
  };
}
