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
 * API endpoint to get tenant by subdomain
 *
 * This endpoint fetches tenant data from the backend based on the subdomain
 * It's used by the TenantContext to resolve the current tenant
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { subdomain } = req.query;
    try {
      const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/tenants/by-subdomain/${subdomain}`);
      if (!response.ok) {
        const error = await response.json();
        return res.status(response.status).json(error);
      }
      const tenant = await response.json();
      return res.status(200).json(tenant);
    } catch (error) {
      return res.status(500).json({ error: 'Internal Server Error', message: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }
}
