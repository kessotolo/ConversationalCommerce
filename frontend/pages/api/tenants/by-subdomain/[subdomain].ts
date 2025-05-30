import { TenantContext } from '@/contexts/TenantContext';
import { Error } from 'react';import { Store } from 'lucide-react';
import { Record } from 'react';import type { NextApiRequest, NextApiResponse } from 'next';

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
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Tenant | ErrorResponse>
) {
  const { subdomain } = req.query;

  if (!subdomain || Array.isArray(subdomain)) {
    return res.status(400).json({ error: 'Invalid subdomain parameter' });
  }

  try {
    // In a real implementation, this would be an API call to your backend
    // For example: 
    // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenants/subdomain/${subdomain}`);
    // const data = await response.json();

    // For demo purposes, we'll mock the tenant data
    // Replace this with an actual API call to your backend
    if (subdomain === 'default') {
      return res.status(200).json({
        id: '00000000-0000-0000-0000-000000000000', // Default UUID
        name: 'Default Store',
        subdomain: 'default',
      });
    }
    
    // Simulating tenant lookup
    const mockTenantData: Record<string, Tenant> = {
      'tenant1': {
        id: '12345678-1234-5678-1234-567812345678',
        name: 'Tenant 1',
        subdomain: 'tenant1',
      },
      'tenant2': {
        id: '87654321-8765-4321-8765-432187654321',
        name: 'Tenant 2',
        subdomain: 'tenant2',
        customDomain: 'tenant2-custom.com',
      },
    };
    
    const tenant = mockTenantData[subdomain];
    
    if (tenant) {
      return res.status(200).json(tenant);
    } else {
      return res.status(404).json({ error: 'Tenant not found' });
    }
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return res.status(500).json({ error: 'Failed to fetch tenant data' });
  }
}
