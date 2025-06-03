# Monitoring, Audit Log, and Alerts

## Audit Log Table
- Use `AuditLogTable` to display conversation-related audit log entries for a tenant.
- Pass the `tenantId` prop to filter logs for the current tenant.
- Example:

```tsx
import AuditLogTable from 'src/components/monitoring/AuditLogTable';

const tenantId = localStorage.getItem('tenant_id') || '';

<AuditLogTable tenantId={tenantId} />
```

## Alerts & Notifications
- Use `NotificationCenter` to show alerts and notifications for the tenant.
- Example:

```tsx
import NotificationCenter from 'src/components/monitoring/NotificationCenter';

<NotificationCenter />
```

## Event-Based Monitoring
- Conversation events are logged to the audit log and can trigger alerts based on tenant configuration.
- See backend docs for configuring alert rules and audit log integration.

## WhatsApp Alerting
- Sellers can set their WhatsApp number in the dashboard (Settings > General tab).
- Alerts for critical events are sent to the seller's WhatsApp via Twilio.
- The WhatsApp number is managed via the /tenants/me API endpoints.