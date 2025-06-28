import type { NextApiRequest, NextApiResponse } from 'next';

type HasTenantResponse = {
  hasTenant: boolean;
  tenantId?: string;
};

type ErrorResponse = {
  error: string;
  message: string;
};

/**
 * API endpoint to check if a user has an associated tenant
 *
 * This is used during onboarding to determine if the user
 * should be redirected to the dashboard or the onboarding flow
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { userId } = req.query;
    try {
      const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/users/${userId}/tenant`);
      if (!response.ok) {
        const error = await response.json();
        return res.status(response.status).json(error);
      }
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Internal Server Error', message: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }
}

// Mock function to check if user has a tenant
// In production, this would query your backend database
interface UserTenant {
  id: string;
  name: string;
}

async function checkUserTenant(userId: string): Promise<UserTenant | null> {
  // Simulate API call with a short delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // For demo purposes, we'll return null for most users
  // indicating they don't have a tenant yet

  // In a real implementation, this would be a database query like:
  // SELECT t.id, t.name FROM tenants t
  // JOIN user_tenants ut ON t.id = ut.tenant_id
  // WHERE ut.user_id = $1

  // Hardcoded sample user for testing - in production this would be from the database
  if (userId === 'user_2NNPfXTCYbIyKVr5m3XtNPfrB66') {
    return {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Test Store',
    };
  }

  return null;
}
