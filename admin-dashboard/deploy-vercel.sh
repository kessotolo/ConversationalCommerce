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

# Deploy to Vercel
echo "🔄 Starting deployment..."
vercel --prod

echo "✅ Deployment complete!"
echo "🌐 Your admin dashboard should now be live on Vercel"