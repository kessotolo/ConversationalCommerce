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
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HasTenantResponse | ErrorResponse>
) {
  // Only allow GET for tenant check
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method Not Allowed', 
      message: 'Only GET requests are supported' 
    });
  }

  const { userId } = req.query;

  if (!userId || Array.isArray(userId)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'User ID is required and must be a single value'
    });
  }

  try {
    // In production, this would check your database to see if the user
    // has an associated tenant record
    const userTenant = await checkUserTenant(userId);
    
    return res.status(200).json({
      hasTenant: !!userTenant,
      ...(userTenant ? { tenantId: userTenant.id } : {})
    });
  } catch (error) {
    console.error('Error checking user tenant:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check user tenant'
    });
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
  await new Promise(resolve => setTimeout(resolve, 300));
  
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
      name: 'Test Store'
    };
  }
  
  return null;
}
