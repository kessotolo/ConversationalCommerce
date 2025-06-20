# WhatsApp Alerting System

## 🚀 Our Core: Commerce in Conversation

WhatsApp alerting in the Conversational Commerce platform enables real-time notifications directly to sellers through Africa's most popular messaging platform. This feature aligns with our core vision of making commerce in conversation the default by enabling seamless, contextual alerts that match how African businesses naturally communicate.

## Integration with WhatsApp NLP Cart Management ✅ VERIFIED

WhatsApp alerting now works in harmony with our multi-tenant WhatsApp NLP cart management system. Both systems have been successfully verified against requirements:

- **Seller's Own WhatsApp Numbers**: Confirmed both alerting and cart management use the seller's WhatsApp number ✅
- **Multi-Tenant Message Routing**: Both systems correctly identify tenants based on WhatsApp numbers ✅
- **Complementary Functionality**: Alerting and cart management use the same tenant WhatsApp number configuration ✅
- **Shared Infrastructure**: Both leverage the Twilio integration for sending and receiving messages ✅

## Overview

The WhatsApp alerting system allows sellers to receive immediate notifications about important events in their business, such as:

- New customer conversations
- Order placements
- Payment confirmations
- Inventory alerts
- Security events
- System notifications
- NLP cart operations (new)

These alerts are delivered directly to the seller's WhatsApp number, allowing them to stay informed even when they're away from the dashboard. The system now includes notifications about NLP-processed cart operations, providing sellers with real-time visibility into customer actions performed via WhatsApp.

## Architecture

The WhatsApp alerting system is built on a modular architecture:

1. **Alert Service Layer**: Core service in `backend/app/services/alert_service.py` that determines when and what to send
2. **WhatsApp Integration Service**: Dedicated service in `backend/app/services/whatsapp_alert_service.py` using Twilio
3. **Tenant WhatsApp Settings**: Tenant model extensions to store and manage WhatsApp numbers
4. **Frontend Management UI**: Settings drawer integration for sellers to configure their WhatsApp number

## Configuration

### Environment Variables

The following environment variables are required for WhatsApp alerting:

```
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_NUMBER=your_whatsapp_number
```

These should be set in your deployment environment (see DEPLOYMENT.md).

### Seller WhatsApp Number Setup

Sellers can set up their WhatsApp number through the Settings drawer:

1. Navigate to the dashboard
2. Open the Settings drawer
3. Go to the "General" tab
4. Enter and save their WhatsApp number in international format (e.g., +2349012345678)

## Implementation Details

### Backend Services

1. **Alert Service** (`alert_service.py`):

   - Defines alert types and formats
   - Determines routing (WhatsApp, email, SMS)
   - Ensures tenant isolation for alerts

2. **WhatsApp Alert Service** (`whatsapp_alert_service.py`):
   - Handles Twilio API integration
   - Formats messages for WhatsApp
   - Manages delivery and error handling

### Tenant WhatsApp Number Management

1. **Model Extension**:

   - The `Tenant` model includes a `whatsapp_number` field
   - Migration scripts handle database updates

2. **API Endpoints**:
   - `GET /tenants/me` - Retrieve current tenant profile including WhatsApp number
   - `PATCH /tenants/me` - Update tenant WhatsApp number with validation

### Frontend Components

1. **Settings Drawer**:
   - WhatsApp number input field with validation
   - Save button with loading and success states
   - Error handling with user-friendly messages

## Security Considerations

- WhatsApp numbers are protected by tenant isolation
- Only authenticated tenants can view or update their own WhatsApp number
- All API endpoints enforce proper authentication and authorization
- WhatsApp messages are sent only to verified tenant numbers

## Future Enhancements

Planned improvements to the WhatsApp alerting system:

1. **Customizable Alert Preferences**: Allow sellers to choose which alerts they receive on WhatsApp
2. **Rich Media Alerts**: Include images, formatted text, and interactive buttons in alerts
3. **Two-Way Communication**: Enable sellers to respond to alerts directly in WhatsApp
4. **Alert Templates**: Pre-approved WhatsApp Business templates for different alert types
5. **Analytics**: Track alert delivery, open rates, and response times
6. **Multi-Channel Routing**: Intelligently route alerts across WhatsApp, SMS, and email based on urgency and delivery success
7. **NLP Response Management**: Allow sellers to configure automated responses to common customer queries
8. **Cart Management Insights**: Provide summary reports of cart actions taken through WhatsApp
9. **Conversion Tracking**: Track which WhatsApp cart interactions lead to completed orders

## Troubleshooting

Common issues and solutions:

1. **Missing WhatsApp Alerts**:

   - Verify Twilio credentials are correctly set
   - Confirm the seller's WhatsApp number is in international format
   - Check backend logs for Twilio API errors

2. **Failed to Save WhatsApp Number**:

   - Ensure the number is in proper international format
   - Verify authentication is working correctly
   - Check network connectivity and API errors in browser console

3. **WhatsApp Number Not Displaying in Settings**:
   - Verify authentication and tenant context
   - Check network requests in browser developer tools
   - Ensure proper API response from `/tenants/me` endpoint

## Backend Event-Driven Monitoring & Alerting (2024-06)

- WhatsApp alerting is now fully integrated with the backend event system and Prometheus metrics.
- All critical events (order, payment, webhook failures) are monitored and alertable via Prometheus Alertmanager and Sentry.
- See backend/README.md and frontend/docs/MONITORING.md for details.

### Analytics, Fulfillment, and Alerting (2024-06)

- Analytics logging is now structured (JSON), fulfillment is event-driven, and alerting is actionable and ready for real integration.
- See backend/README.md and MONITORING.md for details.
