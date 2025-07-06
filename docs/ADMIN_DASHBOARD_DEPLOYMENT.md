# Admin Dashboard Deployment Guide

Complete guide for deploying the ConversationalCommerce admin dashboard to Vercel with custom domain `admin.enwhe.io`.

## 🎯 Overview

This guide walks you through deploying the admin dashboard as a separate Vercel project with:
- Custom domain: `admin.enwhe.io`
- Staff-only access with IP allowlisting
- Secure environment isolation
- Integration with your Railway backend

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Domain Control**: Access to manage DNS for `enwhe.io`
3. **Railway Backend**: Your backend must be deployed and accessible
4. **Clerk Setup**: Clerk account with organization feature enabled

## 🚀 Step-by-Step Deployment

### Step 1: Prepare the Admin Dashboard

```bash
# Navigate to admin dashboard directory
cd admin-dashboard

# Install dependencies
npm install

# Test build locally
npm run build
```

### Step 2: Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

#### Option B: Using Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your repository
4. Set root directory to `admin-dashboard`
5. Click "Deploy"

### Step 3: Configure Environment Variables

In your Vercel project settings, add these environment variables:

#### Required Variables

```bash
# Backend API URL (your Railway deployment)
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app

# Admin domain
NEXT_PUBLIC_ADMIN_DOMAIN=admin.enwhe.io

# Clerk configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

#### Optional Variables

```bash
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### Step 4: Configure Custom Domain

1. **In Vercel Dashboard:**
   - Go to your project settings
   - Navigate to "Domains"
   - Click "Add Domain"
   - Enter `admin.enwhe.io`
   - Click "Add"

2. **Update DNS Records:**
   - Add a CNAME record pointing `admin.enwhe.io` to your Vercel deployment
   - Or add A records as instructed by Vercel

3. **Verify Domain:**
   - Wait for DNS propagation (can take up to 48 hours)
   - Vercel will automatically provision SSL certificate

### Step 5: Configure Backend for Admin Domain

Update your Railway backend environment variables:

```bash
# CORS Configuration
ALLOWED_ORIGINS=https://admin.enwhe.io
BACKEND_CORS_ORIGINS=https://admin.enwhe.io

# Admin Security Settings
ADMIN_ENFORCE_IP_RESTRICTIONS=true
ADMIN_REQUIRE_2FA=true
ADMIN_MODE=true
ADMIN_DOMAIN=admin.enwhe.io
```

### Step 6: Set Up Clerk Organization

1. **In Clerk Dashboard:**
   - Enable Organizations feature
   - Create a "Staff" organization
   - Add your admin users to the Staff organization

2. **Update Clerk Settings:**
   - Set organization-based access control
   - Configure staff role permissions
   - Test authentication flow

### Step 7: Configure IP Allowlisting

1. **Add Your IP to Allowlist:**
   ```bash
   # Use the admin API to add your IP
   curl -X POST https://your-backend-url.railway.app/api/admin/ip-allowlist \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "ip_address": "YOUR_IP_ADDRESS",
       "description": "Admin access",
       "is_active": true
     }'
   ```

2. **Test IP Restriction:**
   - Try accessing from allowed IP (should work)
   - Try accessing from different IP (should be blocked)

## 🔧 Advanced Configuration

### Security Headers

The admin dashboard automatically includes these security headers:

```javascript
// Configured in next.config.js and vercel.json
{
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy": "default-src 'self'; ...",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()"
}
```

### Environment-Specific Configurations

#### Development
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ADMIN_DOMAIN=localhost:3001
```

#### Staging
```bash
NEXT_PUBLIC_API_URL=https://staging-backend.railway.app
NEXT_PUBLIC_ADMIN_DOMAIN=admin-staging.enwhe.io
```

#### Production
```bash
NEXT_PUBLIC_API_URL=https://api.enwhe.io
NEXT_PUBLIC_ADMIN_DOMAIN=admin.enwhe.io
```

## 🧪 Testing the Deployment

### 1. Basic Functionality Test

```bash
# Test admin dashboard access
curl -I https://admin.enwhe.io

# Should return 200 OK with security headers
```

### 2. Authentication Test

1. Visit `https://admin.enwhe.io`
2. Should redirect to Clerk sign-in
3. Sign in with staff account
4. Should redirect to admin dashboard

### 3. API Connectivity Test

1. Open browser dev tools
2. Check network requests to backend
3. Verify CORS headers are correct
4. Test API endpoints work

### 4. Security Test

1. **IP Allowlisting:**
   - Access from allowed IP (should work)
   - Access from blocked IP (should return 403)

2. **Staff Role:**
   - Sign in with staff account (should work)
   - Sign in with non-staff account (should be denied)

3. **2FA (if enabled):**
   - Complete 2FA setup
   - Test 2FA verification

## 🔍 Troubleshooting

### Common Issues

#### 1. CORS Errors
```bash
# Check backend CORS settings
# Ensure ALLOWED_ORIGINS includes https://admin.enwhe.io
```

#### 2. Authentication Failures
```bash
# Check Clerk configuration
# Verify organization membership
# Check staff role assignment
```

#### 3. IP Allowlist Issues
```bash
# Check your current IP
curl https://ipinfo.io/ip

# Add IP to allowlist via backend API
# Or temporarily disable IP restrictions for testing
```

#### 4. Environment Variables
```bash
# Verify all required env vars are set in Vercel
# Check for typos in variable names
# Ensure values are correct (no trailing spaces)
```

### Debug Commands

```bash
# Check Vercel deployment logs
vercel logs

# Test local build
npm run build
npm start

# Check environment variables
vercel env ls
```

## 📊 Monitoring and Maintenance

### Performance Monitoring

1. **Vercel Analytics:**
   - Enable in Vercel dashboard
   - Monitor page load times
   - Track user interactions

2. **Backend Monitoring:**
   - Check Railway logs
   - Monitor API response times
   - Set up alerts for errors

### Security Monitoring

1. **Access Logs:**
   - Monitor failed authentication attempts
   - Check IP allowlist violations
   - Review admin actions

2. **Regular Updates:**
   - Update dependencies monthly
   - Review security settings quarterly
   - Rotate API keys as needed

## 🚨 Emergency Procedures

### Emergency Lockout

If you need to immediately lock down the admin system:

1. **Disable IP Allowlist:**
   ```bash
   # Remove all IPs from allowlist
   # Or set ADMIN_ENFORCE_IP_RESTRICTIONS=false
   ```

2. **Disable Admin Access:**
   ```bash
   # Set ADMIN_MODE=false in backend
   # Or remove staff roles from users
   ```

### Recovery Procedures

1. **Lost 2FA Access:**
   - Use backup codes
   - Super admin can reset 2FA
   - Database-level reset if needed

2. **Locked Out by IP:**
   - Add IP via backend database
   - Use temporary bypass if configured
   - Contact other admin users

## 📝 Deployment Checklist

- [ ] Admin dashboard builds successfully
- [ ] Vercel project created and deployed
- [ ] Custom domain `admin.enwhe.io` configured
- [ ] Environment variables set in Vercel
- [ ] Backend CORS configured for admin domain
- [ ] Clerk organization set up with staff members
- [ ] IP allowlisting configured and tested
- [ ] 2FA enabled and tested
- [ ] Security headers verified
- [ ] Authentication flow tested
- [ ] API connectivity verified
- [ ] Error handling tested
- [ ] Performance monitoring enabled
- [ ] Security monitoring configured
- [ ] Emergency procedures documented
- [ ] Team access granted and tested

## 🎉 Success!

Your admin dashboard is now deployed and secured at `https://admin.enwhe.io` with:

✅ **Staff-only access** with Clerk organization membership
✅ **IP allowlisting** for additional security
✅ **2FA enforcement** for admin accounts
✅ **Comprehensive security headers** for protection
✅ **Domain isolation** from main application
✅ **Environment separation** for secure operations

Your staff can now securely access the super admin dashboard to manage the ConversationalCommerce platform!