# Environment Variables Template

This document provides a template for required environment variables in the ConversationalCommerce platform. Copy these values into your `.env` file and update with your specific configuration.

## Database Connection
```
# Database Connection (now using asyncpg)
POSTGRES_SERVER=localhost
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password  # Leave empty if using peer authentication
POSTGRES_DB=postgres  # Or your specific database name
# Optional: directly override full DATABASE_URL
# DATABASE_URL=postgresql+asyncpg://user@localhost:5432/dbname
```

## API and Security
```
# API Settings
PROJECT_NAME=Conversational Commerce Platform
ENVIRONMENT=development  # Options: development, testing, production

# Security
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=11520  # 8 days
```

## External Services
```
# Cloudinary (Image Storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Twilio (WhatsApp/SMS)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=your-phone-number
TWILIO_WHATSAPP_FROM=your-whatsapp-number  # WhatsApp number without the +
```

## Payment Provider Credentials
```
# Payment Encryption
PAYMENT_REF_SECRET=your-payment-ref-secret

# Payment Providers
PAYSTACK_SECRET_KEY=your-paystack-secret
FLUTTERWAVE_SECRET_KEY=your-flutterwave-secret
STRIPE_SECRET_KEY=your-stripe-secret

# M-Pesa
MPESA_CONSUMER_KEY=your-mpesa-consumer-key
MPESA_CONSUMER_SECRET=your-mpesa-consumer-secret
MPESA_SHORTCODE=your-mpesa-shortcode
MPESA_PASSKEY=your-mpesa-passkey
```

## Shipping Provider Credentials
```
# Sendy API Credentials
SENDY_API_KEY=your-sendy-api-key
SENDY_API_USERNAME=your-sendy-username
SENDY_API_URL=https://api.sendyit.com/v1
SENDY_VENDOR_TYPE=express  # Options: express, motorcycle, pickup

# Default shipping provider to use (will fall back to 'mock' if not configured)
DEFAULT_SHIPPING_PROVIDER=sendy
```

## Storefront Settings
```
# Storefront
BASE_DOMAIN=localhost
ENABLE_STOREFRONT=true
SUBDOMAIN_SEPARATOR=.
```

## CORS and Frontend Settings
```
# CORS Settings - Add additional domains as needed
ALLOWED_ORIGINS=http://localhost,http://localhost:3000,http://127.0.0.1,http://127.0.0.1:3000
BACKEND_CORS_ORIGINS=https://enwhe.io,https://*.enwhe.io
```

## Caching and Redis
```
# Redis and Caching
REDIS_URL=redis://localhost:6379/0
ENABLE_CACHE=true
REDIS_DISABLED=false
DISABLE_REDIS_IN_PRODUCTION=false
IS_CONTAINER=false
CACHE_EXPIRATION=300
```

## Testing
```
# Testing
TESTING=false
```

## Note on Alembic Configuration
For Alembic migrations, the database connection is configured in `alembic.ini`:
```
[alembic]
script_location = alembic
sqlalchemy.url = postgresql+asyncpg://user@localhost:5432/dbname
```

This file has been updated to use the asyncpg driver instead of psycopg2.
