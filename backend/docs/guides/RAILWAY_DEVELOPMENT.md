# Railway Development Environment Setup

## Overview

This project uses Railway-hosted Postgres databases for both development and production environments. This provides several benefits:

- Consistent database environment across development and production
- No need for local Docker setup for database
- Better team collaboration with shared development databases
- Simplified configuration and deployment

## Setup Instructions

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login to Railway

```bash
railway login
```

### 3. Create Development Environment

Create a new project in Railway specifically for development, or create a new environment in your existing project:

```bash
# Option 1: Create new project
railway init

# Option 2: Link to existing project and create environment
railway link
railway environment create development
```

### 4. Provision a Postgres Database

In your development environment:

```bash
railway add
```

Select PostgreSQL from the services menu.

### 5. Get Database Connection URL

```bash
railway variables get DATABASE_URL
```

### 6. Update Your Local Environment

Add the Railway development database URL to your `.env.development` file:

```
DATABASE_URL=postgresql://username:password@host:port/database
```

## Usage

### Switch Between Development and Production

```bash
# Use development environment
railway environment development

# Use production environment
railway environment production
```

### Run Commands Against Development Database

```bash
railway run alembic upgrade head
```

### Connect to Development Database

```bash
railway connect
```

## Best Practices

1. **DB Migrations**: Run migrations on development first, then production
2. **Environment Variables**: Keep sensitive credentials in Railway environment variables
3. **Local Development**: You can still use Docker locally if preferred, but Railway DB is recommended

## Troubleshooting

If you encounter connection issues:
- Check IP allowlist settings in Railway
- Verify your connection string has the correct format
- Try connecting via Railway proxy: `railway connect`
