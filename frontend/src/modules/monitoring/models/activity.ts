import type { TenantScoped, UUID } from '@/modules/core/models/base';

export interface Activity extends TenantScoped {
  user_id: UUID;
  action: string;
  resource_type: string;
  resource_id: UUID;
  details: {
    path: string;
    method: string;
    status_code: number;
    duration: number;
    ip_address: string;
    user_agent: string;
  };
  timestamp: string;
}
