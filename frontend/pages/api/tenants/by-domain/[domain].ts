import type { NextApiRequest, NextApiResponse } from 'next';

type Tenant = {
  id: string; // UUID format from backend
  name: string;
  subdomain: string;
  customDomain?: string;
};

type ErrorResponse = {
  error: string;
};

/**
 * API endpoint to get tenant by custom domain
 * 
 * This endpoint fetches tenant data from the backend based on a custom domain
 * It's used by the TenantContext when a user accesses the site via a custom domain
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Tenant | ErrorResponse>
) {
  const { domain } = req.query;

  if (!domain || Array.isArray(domain)) {
    return res.status(400).json({ error: 'Invalid domain parameter' });
  }

  try {
    // In a real implementation, this would be an API call to your backend
    // For example: 
    // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenants/domain/${encodeURIComponent(domain)}`);
    // const data = await response.json();

    // For demo purposes, we'll mock the tenant data with custom domains
    // This should be replaced with an actual API call to your backend that fetches the StorefrontTheme
    const mockTenantData: Record<string, Tenant> = {
      'tenant1-custom.com': {
        id: '12345678-1234-5678-1234-567812345678',
        name: 'Tenant 1',
        subdomain: 'tenant1',
        customDomain: 'tenant1-custom.com',
      },
      'tenant2-custom.com': {
        id: '87654321-8765-4321-8765-432187654321',
        name: 'Tenant 2',
        subdomain: 'tenant2',
        customDomain: 'tenant2-custom.com',
      },
      'joescoffee.com': {
        id: 'abcdef12-3456-7890-abcd-ef1234567890',
        name: 'Joe\'s Coffee',
        subdomain: 'joes-coffee',
        customDomain: 'joescoffee.com',
      },
    };
    
    // Clean up the domain parameter (remove protocol, www, trailing slashes)
    const cleanDomain = domain.replace(/^https?:\/\//i, '')
                             .replace(/^www\./i, '')
                             .replace(/\/+$/, '');
    
    const tenant = mockTenantData[cleanDomain];
    
    if (tenant) {
      return res.status(200).json(tenant);
    } else {
      return res.status(404).json({ error: 'Tenant not found for this domain' });
    }
  } catch (error) {
    console.error('Error fetching tenant by domain:', error);
    return res.status(500).json({ error: 'Failed to fetch tenant data' });
  }
}
