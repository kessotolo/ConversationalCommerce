# WhatsApp Alerting System

## 🚀 Our Core: Commerce in Conversation

WhatsApp alerting in the Conversational Commerce platform enables real-time notifications directly to sellers through Africa's most popular messaging platform. This feature aligns with our core vision of making commerce in conversation the default by enabling seamless, contextual alerts that match how African businesses naturally communicate.

## Overview

The WhatsApp alerting system allows sellers to receive immediate notifications about important events in their business, such as:

- New customer conversations
- Order placements
- Payment confirmations
- Inventory alerts
- Security events
- System notifications

These alerts are delivered directly to the seller's WhatsApp number, allowing them to stay informed even when they're away from the dashboard.

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
