# Admin Dashboard Deployment Guide

## Vercel Deployment Setup

### 1. Project Configuration

**Vercel Dashboard Settings:**
- **Framework**: Next.js
- **Root Directory**: `admin-dashboard`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node.js Version**: 18.x

### 2. Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app

# Admin Domain Configuration
NEXT_PUBLIC_ADMIN_DOMAIN=admin.enwhe.com

# Clerk Authentication (SuperAdmin Organization)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Production Settings
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### 3. Domain Configuration

**Custom Domain Setup:**
1. Add `admin.enwhe.com` as custom domain in Vercel
2. Configure DNS records:
   ```
   Type: CNAME
   Name: admin
   Value: cname.vercel-dns.com
   ```

### 4. Security Configuration

The `vercel.json` file includes:
- **Security Headers**: HSTS, CSP, X-Frame-Options
- **Content Security Policy**: Clerk integration allowed
- **Regional Deployment**: US East (iad1) for low latency

### 5. Deployment Commands

**Manual Deployment:**
```bash
cd admin-dashboard
vercel --prod
```

**Automated Deployment:**
```bash
# Use the deployment script
./deploy-vercel.sh
```

### 6. Troubleshooting

**Common Issues:**

1. **Build Fails - Missing Dependencies**
   ```bash
   # Solution: Ensure all dependencies are in package.json
   npm install
   npm run build  # Test locally first
   ```

2. **Environment Variables Not Found**
   ```bash
   # Solution: Check Vercel dashboard environment variables
   # Ensure all NEXT_PUBLIC_ variables are set
   ```

3. **Clerk Authentication Issues**
   ```bash
   # Solution: Verify Clerk publishable key and domain configuration
   # Check Clerk dashboard for correct organization settings
   ```

4. **API Connection Issues**
   ```bash
   # Solution: Verify NEXT_PUBLIC_API_URL points to correct backend
   # Check CORS settings in backend for admin domain
   ```

### 7. Production Checklist

Before deploying:
- [ ] All environment variables set in Vercel
- [ ] Backend API accessible from admin domain
- [ ] Clerk organization configured with correct domain
- [ ] DNS records configured for custom domain
- [ ] Build passes locally (`npm run build`)
- [ ] Security headers configured
- [ ] SuperAdmin organization ID updated in backend

### 8. Post-Deployment Verification

After deployment:
- [ ] Admin dashboard accessible at custom domain
- [ ] Clerk authentication working
- [ ] API calls successful
- [ ] Security headers present (check browser dev tools)
- [ ] SuperAdmin features functional
- [ ] Session management working

### 9. Monitoring & Maintenance

**Vercel Analytics:**
- Enable Vercel Analytics for performance monitoring
- Set up alerts for deployment failures
- Monitor function execution times

**Security Monitoring:**
- Regular security header audits
- Clerk organization member reviews
- API access log monitoring

## Deployment Separation Architecture

### Current Setup
```
ConversationalCommerce/
├── admin-dashboard/     # Vercel Project: admin-dashboard
├── frontend/           # Vercel Project: main-app
├── backend/            # Railway Project: backend-api
└── docs/              # Shared documentation
```

### Domain Strategy
- **admin.enwhe.com** → Admin Dashboard (Vercel)
- **app.enwhe.io** → Main App (Vercel)
- **api.enwhe.com** → Backend API (Railway)

### Benefits
- **Security Isolation**: Admin and main app completely separated
- **Independent Scaling**: Each service scales independently
- **Deployment Isolation**: Admin deployments don't affect main app
- **Environment Separation**: Different environment variables and secrets
- **Domain-Based Security**: Different security policies per domain