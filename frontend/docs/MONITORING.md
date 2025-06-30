# Monitoring, Audit Log, and Alerts

## 🚀 Our Core: Commerce in Conversation

Monitoring, audit, and alerting in ConversationalCommerce are designed to support commerce in conversation as the default. All monitoring flows, audit logs, and alerts are built to work seamlessly in chat (WhatsApp, IG, TikTok, etc.) as well as on the web. The webapp is a complement, but the heart of the platform is enabling every commerce action—discovery, cart, upsell, checkout, payment—through natural conversation, just as Africans do commerce every day.

## 🌐 Frictionless Entry Points for Conversational Commerce

To make commerce as seamless as chatting with a friend, the platform supports and plans to support a wide range of modern entry points:

- **QR Codes**: Scan to start a chat, buy a product, or join a group. Used on packaging, posters, receipts, and more.
- **NFC Tags & Smart Posters**: Tap your phone on a market stall, product, or poster to instantly start a conversation.
- **Deep Links & App Clips/Instant Apps**: One-tap links that launch WhatsApp, IG, or your app with pre-filled context—no install required.
- **SMS Short Codes & Keywords**: Text a memorable code or keyword to start shopping, even on feature phones.
- **Voice Activation & Audio Triggers**: Use voice commands or audio watermarks in ads to launch a shopping chat.
- **Social Referral Links**: Shareable links and receipts that let friends buy what you bought, with full context.
- **Visual Search & Image Recognition**: Snap a photo of a product or friend's item to start a shopping conversation.
- **Location-Based Triggers**: Geofenced notifications or Bluetooth beacons that prompt a chat when near a store or market.
- **Offline-to-Online Bridges**: USSD codes, SMS fallbacks, and scratch-off cards for users with limited connectivity.
- **Phone Numbers**: Phone numbers are a first-class identifier for users and sellers, enabling SMS, WhatsApp, and voice flows.

**African Context:** The platform is designed to combine these approaches, adapting to urban and rural realities. QR codes and phone numbers are first-class, but the system is extensible to all modern entry points, ensuring everyone can join the conversation—no matter their device or connectivity.

## 🤝 Trust & Naturalness in Conversational Commerce

Trust is at the heart of commerce in Africa. Our monitoring and alerting are designed so that buyers and sellers always feel like they're talking to real people, not bots. We prioritize:

- **Authentic, Human-Like Chat:** No "bot speak"—conversations use local language, slang, and context-aware replies.
- **Clear Identity:** Always show who is speaking (buyer, seller, or assistant), but keep automation subtle and helpful.
- **Personalization:** Use names, local expressions, and context to make every chat feel personal.
- **Trust Signals:** Verified badges, clear receipts, and confirmations that look and feel like real commerce.
- **Privacy & Security:** Respect for phone numbers and personal info, with clear opt-in/out for notifications.
- **Seamless Human Escalation:** If a conversation gets stuck, it's easy to talk to a real person—no dead ends.

Our conversational engine is trained on real African chat data, supports local dialects, and is always improving to make commerce feel as natural and trustworthy as chatting with a friend or local vendor.

## Monitoring System Components

The monitoring system consists of several key components that work together to provide comprehensive visibility into the platform:

### 1. Activity Dashboard

The `ActivityDashboard` component (`src/components/monitoring/ActivityDashboard.tsx`) provides a real-time overview of system activity:

- Real-time event monitoring via WebSocket connection
- Visualization of conversation flows and customer interactions
- Tenant-scoped activity feed showing only relevant events
- Performance metrics and system health indicators

### 2. Performance Monitoring

The `PerformanceMonitoring` utility (`src/utils/PerformanceMonitoring.ts`) provides comprehensive tracking of performance metrics, especially important for mobile devices:

- Tracks Core Web Vitals (LCP, FID, CLS) using web-vitals library
- Monitors long tasks and resource loading times
- Provides custom timing functions for component render and data loading
- Rates performance as 'good', 'needs-improvement', or 'poor' based on established thresholds
- Allows developer debugging with custom metric listeners

For development and QA testing, the `PerformanceAuditOverlay` component (`src/modules/shared/components/PerformanceAuditOverlay.tsx`) provides real-time visualization of these metrics:

- Shows Core Web Vitals and custom metrics in a collapsible overlay
- Displays device information and network status
- Allows real-time recording and clearing of metrics
- Color-codes results based on performance rating
- Only available in non-production environments

### 3. Mobile Optimization Service

The `MobileOptimizationService` (`src/services/MobileOptimizationService.ts`) provides device detection and optimization:

- Detects device type (mobile, tablet, desktop) and performance class (low, medium, high)
- Monitors network status and connection quality
- Provides optimization recommendations for touch targets, image quality, and UI complexity
- Helps components adapt to different device capabilities

### 4. Audit Log System

The audit logging system (`src/components/monitoring/AuditLogTable.tsx`) tracks all security-sensitive operations:

- Comprehensive logging of CRUD operations, authentication events, and system changes
- Tenant isolation to ensure data privacy
- Filterable and searchable log entries
- Exportable logs for compliance requirements

### 3. Notification Center

The `NotificationCenter` component provides a unified interface for system notifications:

- Real-time alerts for critical events
- Priority-based notification queuing
- Read/unread state management
- Action links for quick response to notifications

### 4. Alert Service Integration

The monitoring system integrates with the alert service to provide:

- Real-time alerting via WebSocket
- WhatsApp alerts for critical events (see WHATSAPP_ALERTING.md)
- Email notifications for non-urgent updates
- SMS fallback for critical alerts when WhatsApp is unavailable

## WhatsApp Alert Integration

The monitoring system is fully integrated with our WhatsApp alerting infrastructure:

- Critical alerts are sent to the seller's configured WhatsApp number
- Alert types include new customer conversations, orders, and system events
- Sellers can manage their WhatsApp number in the Settings drawer
- See detailed documentation in [WHATSAPP_ALERTING.md](./WHATSAPP_ALERTING.md)

## Technical Implementation

### Real-time Data Flow

1. Backend events are captured by the alert service
2. Events are published to WebSocket clients
3. Frontend components subscribe to relevant event types
4. UI updates in real-time to reflect system state
5. Critical alerts trigger WhatsApp notifications via Twilio

### Performance Considerations

The monitoring system is optimized for African markets:

- Minimal bandwidth usage for WebSocket connections
- Graceful degradation when connection is lost
- Local caching of recent events for offline viewing
- Batch updates to reduce network traffic

### Security and Tenant Isolation

- All monitoring data is scoped to the authenticated tenant
- WebSocket connections are authenticated and authorized
- Audit logs enforce tenant boundaries at the database level
- Alert configurations are tenant-specific

## Getting Started with Monitoring

### Using the ActivityDashboard

```tsx
// Example: Adding the Activity Dashboard to a page
import { ActivityDashboard } from '@/components/monitoring/ActivityDashboard';

function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <ActivityDashboard />
    </div>
  );
}
```

### Working with the Audit Log

```tsx
// Example: Adding the Audit Log to a page
import { AuditLogTable } from '@/components/monitoring/AuditLogTable';

function AuditPage() {
  return (
    <div>
      <h1>Audit Logs</h1>
      <AuditLogTable />
    </div>
  );
}
```

## Future Enhancements

Planned improvements to the monitoring system:

1. **Analytics Dashboard**: Comprehensive analytics for conversation flows and commerce metrics
2. **Advanced Filtering**: More powerful filtering options for audit logs and events
3. **Custom Alert Rules**: Allow sellers to define custom alert conditions and thresholds
4. **Mobile Alerts**: Native mobile push notifications for the mobile app
5. **AI-powered Insights**: ML-based anomaly detection and business insights

## Backend Monitoring & Alerting Integration (2024-06)

- The backend is fully integrated with Sentry (error monitoring) and Prometheus (metrics at /metrics for order, payment, and webhook failures).
- Prometheus Alertmanager can be configured for automated alerting on spikes or failures.
- Sentry captures all backend errors and exceptions for developer and ops visibility.
- WhatsApp alerting and the NotificationCenter are fully integrated with the backend event system for real-time notifications.
- See backend/README.md for ops setup, alert configuration, and troubleshooting.

## Developer Onboarding: Event-Driven Monitoring

- All monitoring and alerting flows are event-driven. To add new alerts or metrics, register a new event handler in the backend and update Prometheus counters as needed.
- For frontend integration, subscribe to NotificationCenter and WhatsApp alert events as documented above.

## Analytics Logging, Fulfillment, and Alerting (2024-06)

- **Structured analytics logging**: All key events are logged as structured JSON and ready for ingestion by analytics systems (see backend/README.md, order_event_handlers.py).
- **Event-driven fulfillment workflow**: Shipping and delivery are handled by a fulfillment event handler, ready for real-world integration.
- **Actionable alerting**: Email/WhatsApp alert stubs are called for critical failures, with clear extension points for production (see backend/README.md, rules_engine.py).
