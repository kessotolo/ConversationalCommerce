import { UUID, TenantScoped } from '@core/models/base';

export interface AuditLogEntry extends TenantScoped {
  user_id: UUID;
  username: string;
  action: string;
  resource_type: string;
  resource_id: UUID;
  details: Record<string, any>;
  timestamp: string;
}
