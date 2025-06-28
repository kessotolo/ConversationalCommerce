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
  res: NextApiResponse<Tenant | ErrorResponse>,
) {
  const { domain } = req.query;

  if (!domain || Array.isArray(domain)) {
    return res.status(400).json({ error: 'Invalid domain parameter' });
  }

  try {
    // Use real backend API to fetch tenant by domain
    // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenants/domain/${encodeURIComponent(domain)}`);
    // const data = await response.json();

    return res.status(500).json({ error: 'Failed to fetch tenant data' });
  } catch (error) {
    console.error('Error fetching tenant by domain:', error);
    return res.status(500).json({ error: 'Failed to fetch tenant data' });
  }
}
