#!/bin/bash

# Deploy admin-dashboard to Vercel
# This script helps deploy the admin-dashboard from the monorepo structure

echo "🚀 Deploying Admin Dashboard to Vercel..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: No package.json found. Make sure you're in the admin-dashboard directory."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Test build locally first
echo "🔨 Testing build locally..."
if npm run build; then
    echo "✅ Local build successful"
else
    echo "❌ Local build failed. Please fix build errors before deploying."
    exit 1
fi

# Deploy to Vercel
echo "🔄 Starting deployment..."
if vercel --prod; then
    echo "✅ Deployment complete!"
    echo "🌐 Your admin dashboard should now be live on Vercel"
else
    echo "❌ Deployment failed. Check the error messages above."
    echo "💡 Common issues:"
    echo "   - Missing environment variables in Vercel dashboard"
    echo "   - Incorrect root directory setting"
    echo "   - Build command configuration issues"
    exit 1
fi