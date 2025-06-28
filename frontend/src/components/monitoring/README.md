# Monitoring Components

## AuditLogTable

- Displays conversation-related audit log entries for a tenant.
- Usage:

```tsx
import AuditLogTable from './AuditLogTable';
const tenantId = localStorage.getItem('tenant_id') || '';
<AuditLogTable tenantId={tenantId} />;
```

## NotificationCenter

- Displays alerts and notifications for the tenant.
- Usage:

```tsx
import NotificationCenter from './NotificationCenter';
<NotificationCenter />;
```

## WhatsApp Alerting

- Sellers can set their WhatsApp number in the dashboard (Settings > General tab).
- Alerts for critical events are sent to the seller's WhatsApp via Twilio.
- The WhatsApp number is managed via the /tenants/me API endpoints.
