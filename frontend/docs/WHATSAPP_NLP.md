# WhatsApp NLP Cart Management

This document explains how to set up the WhatsApp NLP Cart Management functionality in the Conversational Commerce platform.

## Overview

The WhatsApp NLP Cart Management allows customers to interact with their shopping cart directly through the seller's WhatsApp number. The system uses natural language processing to understand user intentions like:

- Adding products to cart
- Removing products from cart
- Updating quantities
- Viewing cart contents
- Clearing the cart

**Important**: This is a multi-tenant system where each seller uses their own WhatsApp number. The platform routes messages to the appropriate seller based on the WhatsApp number that received the message.

## Setup Requirements

### 1. WhatsApp Business API Integration

There are two ways sellers can connect their WhatsApp numbers:

1. **Platform-managed Twilio integration** (Default):

   - Sellers simply add their WhatsApp number in the settings dashboard
   - The platform routes messages through a central Twilio account
   - Responses are sent from the seller's WhatsApp number via Twilio

2. **Direct WhatsApp Business API** (Advanced):
   - Sellers with their own WhatsApp Business API can connect directly
   - Requires the seller to provide their own API credentials

### 2. Environment Variables

Add these environment variables to your backend `.env` file:

```
# WhatsApp webhook verification (used for both integration methods)
WHATSAPP_API_VERSION=v16.0
WHATSAPP_APP_SECRET=your_app_secret_from_meta
WHATSAPP_VERIFY_TOKEN=create_a_random_string_for_webhook_verification

# Twilio credentials (for platform-managed integration)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=your_platform_whatsapp_number (optional fallback)
```

### 3. Webhook Configuration

1. In your WhatsApp Business API dashboard, set up a webhook with these settings:

   - URL: `https://your-domain.com/api/v1/whatsapp/webhook`
   - Verify Token: The same value you set for `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to: `messages`

2. Verify your webhook is working by sending a test message to your WhatsApp business number.

## How It Works

1. Customer sends a message to the seller's WhatsApp number
2. Message is received by the platform's webhook endpoint
3. System identifies the seller based on the receiving WhatsApp number
4. Message is processed using NLP to detect cart-related intents
5. If a cart action is detected, it is executed on the seller's inventory
6. A response is sent back to the customer from the seller's WhatsApp number

## Supported Commands

Customers can use natural language to interact with their cart:

- "Add 2 Black T-shirt to my cart"
- "Remove red shoes from my cart"
- "Update quantity of blue jeans to 3"
- "What's in my cart?"
- "Clear my cart"

## Seller WhatsApp Number Management

Each seller must register their WhatsApp number through the settings dashboard:

1. Seller logs into their dashboard
2. Goes to Settings → WhatsApp Integration
3. Enters their WhatsApp number in international format (e.g., +2347012345678)
4. Saves the settings

The system then associates this number with the seller's account and routes all messages received on this number to their store's NLP cart management.

## Troubleshooting

If messages are not being processed correctly:

1. Check that all environment variables are set correctly
2. Verify that the webhook is properly configured and receiving events
3. Check server logs for any errors in the WhatsApp webhook endpoint
4. Verify the seller has properly registered their WhatsApp number
5. Make sure the phone number format is consistent (with or without '+' prefix)
6. Test the NLP functionality directly using the API endpoints

## Analytics & Monitoring

All WhatsApp interactions are tracked in the conversation history and analytics dashboards:

1. Sellers can view all WhatsApp conversations in their dashboard
2. NLP detection success rates are monitored
3. Cart conversion analytics show effectiveness of WhatsApp cart management
