# Deployment Guide - ConversationalCommerce

## Overview

ConversationalCommerce uses a **modular monolith architecture** with separate deployment targets:

- **Frontend** (`frontend/`) - Main application
- **Admin Dashboard** (`admin-dashboard/`) - Admin interface
- **Backend** (`backend/`) - API server

## Vercel Deployment Strategy

### Two Separate Vercel Projects Required

#### Project 1: Main Application
- **Repository**: `kessotolo/ConversationalCommerce`
- **Root Directory**: `frontend`
- **Domain**: `app.enwhe.io`
- **Environment**: Production

#### Project 2: Admin Dashboard
- **Repository**: `kessotolo/ConversationalCommerce`
- **Root Directory**: `admin-dashboard`
- **Domain**: `admin.enwhe.com`
- **Environment**: Production

## Vercel Configuration

### Frontend Project Settings

**Build & Development Settings:**
```
Framework Preset: Next.js
Root Directory: frontend
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Node.js Version: 18.x
```

**Environment Variables:**
```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_APP_DOMAIN=app.enwhe.io

# Cloudinary (if used)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_api_key
```

### Admin Dashboard Project Settings

**Build & Development Settings:**
```
Framework Preset: Next.js
Root Directory: admin-dashboard
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Node.js Version: 18.x
```

**Environment Variables:**
```bash
# Clerk Authentication (SuperAdmin Organization)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_ADMIN_DOMAIN=admin.enwhe.com

# Production Settings
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

## Domain Configuration

### DNS Records

**For app.enwhe.io (Frontend):**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

**For admin.enwhe.com (Admin Dashboard):**
```
Type: CNAME
Name: admin
Value: cname.vercel-dns.com
```

## Deployment Process

### 1. Initial Setup

1. **Create two separate Vercel projects**
2. **Connect both to the same GitHub repository**
3. **Configure different root directories**
4. **Set environment variables for each project**
5. **Configure custom domains**

### 2. Deployment Commands

**Frontend:**
```bash
cd frontend
npm run build  # Test locally first
vercel --prod   # Deploy to production
```

**Admin Dashboard:**
```bash
cd admin-dashboard
npm run build  # Test locally first
vercel --prod   # Deploy to production
```

### 3. Automated Deployment

Both projects will automatically deploy when:
- Code is pushed to the `main` branch
- Pull requests are merged
- Manual deployment is triggered

## Troubleshooting

### Common Issues

#### 1. "Module not found" errors
**Problem**: UI components not found
**Solution**: Check root directory setting in Vercel project

#### 2. Build fails with TypeScript errors
**Problem**: Unused imports or type mismatches
**Solution**: Run `npm run build` locally first to fix errors

#### 3. Environment variables not found
**Problem**: Missing or incorrect env vars
**Solution**: Check Vercel project settings → Environment Variables

#### 4. Wrong project building
**Problem**: Frontend building instead of admin-dashboard
**Solution**: Verify root directory setting in Vercel project

### Debug Steps

1. **Check Vercel build logs** for specific error messages
2. **Verify root directory** setting in project configuration
3. **Test build locally** with `npm run build`
4. **Check environment variables** are set correctly
5. **Verify domain configuration** and DNS records

## Security Considerations

### Admin Dashboard Security
- Only accessible from `admin.enwhe.com`
- Requires SuperAdmin organization membership
- Enhanced security headers configured
- IP allowlisting available

### Frontend Security
- Public access from `app.enwhe.io`
- Standard security headers
- User authentication via Clerk
- Rate limiting on API endpoints

## Monitoring

### Vercel Analytics
- Enable for both projects
- Monitor build times and errors
- Track deployment frequency

### Custom Monitoring
- Backend health checks
- API response times
- Error tracking and alerting

## Rollback Procedure

### Quick Rollback
1. **Go to Vercel project dashboard**
2. **Select "Deployments" tab**
3. **Find previous successful deployment**
4. **Click "Promote to Production"**

### Code Rollback
1. **Revert Git commit**
2. **Push to trigger new deployment**
3. **Verify both projects deploy successfully**

## Support

For deployment issues:
1. Check this guide first
2. Review Vercel build logs
3. Test builds locally
4. Contact team if issues persist