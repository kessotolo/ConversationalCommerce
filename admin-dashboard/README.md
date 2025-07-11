# Admin Dashboard

Super Admin dashboard for ConversationalCommerce platform.

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Clerk Authentication
# Get your publishable key from: https://dashboard.clerk.com/last-active?path=api-keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# Optional: Clerk Secret Key (for server-side operations)
# CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here

# Optional: Clerk JWT Template (for custom JWT handling)
# CLERK_JWT_TEMPLATE_NAME=your_jwt_template_name

# Optional: API Base URL (for backend communication)
# NEXT_PUBLIC_API_BASE_URL=https://api.enwhe.com

# Optional: Admin Dashboard URL
# NEXT_PUBLIC_ADMIN_DASHBOARD_URL=https://admin.enwhe.com
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (see above)

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Add the following environment variable in Vercel:
   - **Name:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Value:** Your Clerk publishable key
   - **Environment:** Production (and Preview if needed)

3. Deploy!

### Manual Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Features

- **Authentication:** Clerk-based authentication with SuperAdmin access
- **Dashboard:** Real-time monitoring and metrics
- **Tenant Management:** Complete tenant control and impersonation
- **Security:** IP allowlisting, 2FA, emergency controls
- **RBAC:** Role-based access control management
- **Monitoring:** System health, logs, and alerts

## Routes

- `/` - Main page (redirects to dashboard if authenticated)
- `/dashboard` - Main admin dashboard
- `/dashboard/security` - Security management
- `/dashboard/tenants` - Tenant management
- `/dashboard/users` - User management
- `/dashboard/settings` - System settings