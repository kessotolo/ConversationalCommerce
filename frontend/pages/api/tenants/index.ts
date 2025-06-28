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
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      if (!response.ok) {
        const error = await response.json();
        return res.status(response.status).json(error);
      }
      const tenant = await response.json();
      return res.status(201).json(tenant);
    } catch (error) {
      return res.status(500).json({ error: 'Internal Server Error', message: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }
}

// Mock function to check subdomain availability
// In production, this would call your backend API
async function checkSubdomainAvailability(subdomain: string): Promise<boolean> {
  // Simulate API call with a short delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Mock database check - in production this would be a real check
  const takenSubdomains = ['test', 'admin', 'api', 'app', 'demo', 'dev', 'staging'];
  return !takenSubdomains.includes(subdomain);
}

// Mock function to create a tenant
// In production, this would call your backend API
async function createTenant(
  data: TenantRequest,
): Promise<TenantResponse & { customDomain?: string }> {
  // Simulate API call with a short delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Generate a UUID for the new tenant
  const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
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
