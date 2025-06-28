import type { TenantScoped, UUID } from '@/modules/core/models/base';

export interface AuditLogEntry extends TenantScoped {
  user_id: UUID;
  username: string;
  action: string;
  resource_type: string;
  resource_id: UUID;
  details: Record<string, unknown>;
  timestamp: string;
}
