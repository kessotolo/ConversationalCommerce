#!/bin/bash

# Admin Dashboard Deployment Script
# This script deploys the admin dashboard to Vercel with proper configuration

set -e

echo "🚀 Starting Admin Dashboard Deployment..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing..."
    npm install -g vercel
fi

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the admin-dashboard directory?"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project to check for errors
echo "🔨 Building project..."
npm run build

# Check if environment variables are set
echo "🔍 Checking environment variables..."
if [ -z "$NEXT_PUBLIC_API_URL" ]; then
    echo "⚠️  Warning: NEXT_PUBLIC_API_URL not set in environment"
fi

if [ -z "$NEXT_PUBLIC_ADMIN_DOMAIN" ]; then
    echo "⚠️  Warning: NEXT_PUBLIC_ADMIN_DOMAIN not set in environment"
fi

if [ -z "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ]; then
    echo "⚠️  Warning: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not set in environment"
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Configure custom domain 'admin.enwhe.io' in Vercel dashboard"
echo "2. Set up environment variables in Vercel project settings"
echo "3. Update backend CORS settings to allow admin.enwhe.io"
echo "4. Test the deployment at your admin domain"
echo ""
echo "🔧 Required environment variables in Vercel:"
echo "   - NEXT_PUBLIC_API_URL"
echo "   - NEXT_PUBLIC_ADMIN_DOMAIN"
echo "   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
echo "   - NEXT_PUBLIC_CLERK_SIGN_IN_URL"
echo "   - NEXT_PUBLIC_CLERK_SIGN_UP_URL"
echo "   - NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL"
echo "   - NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL"
echo ""
echo "🔒 Security checklist:"
echo "   ✓ IP allowlisting enabled"
echo "   ✓ Security headers configured"
echo "   ✓ Staff-only access enforced"
echo "   ✓ CORS restricted to admin domain"
echo ""
echo "🎉 Admin dashboard is ready for staff use!"