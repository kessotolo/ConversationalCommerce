#!/bin/bash
# Script to incrementally restore architectural rules while keeping build stable

# Step 1: Update next.config.js to re-enable TypeScript checking but keep ESLint disabled
echo "Step 1: Re-enabling TypeScript type checking..."
sed -i '' 's/ignoreBuildErrors: true/ignoreBuildErrors: false/' next.config.js

# Step 2: Run local test build to see if TypeScript passes
echo "Step 2: Testing build with TypeScript checking..."
SKIP_PREFLIGHT_CHECK=true NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS='--max-old-space-size=8192' npx next build

# Step 3: If TypeScript check passes, enable basic ESLint rules
if [ $? -eq 0 ]; then
  echo "TypeScript checks passed! Enabling basic ESLint rules..."
  
  # Create intermediate ESLint config that's more complete than ultra-minimal
  # but not as strict as the full one
  cp .eslintrc.js .eslintrc.intermediate.js
  
  # Update next.config.js to use intermediate ESLint config
  sed -i '' 's/ignoreDuringBuilds: true/ignoreDuringBuilds: false/' next.config.js
  
  # Test build with intermediate ESLint
  echo "Testing build with intermediate ESLint rules..."
  ESLINT_CONFIG_FILE=.eslintrc.intermediate.js SKIP_PREFLIGHT_CHECK=true NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS='--max-old-space-size=8192' npx next build
else
  echo "TypeScript checks failed. Please fix TypeScript errors before enabling ESLint."
  exit 1
fi

# Step 4: If intermediate ESLint passes, suggest restoring full architecture
if [ $? -eq 0 ]; then
  echo "Intermediate ESLint checks passed! You can now restore full architectural rules."
  echo "Steps to restore full architecture:"
  echo "1. Remove or archive build-override.js (keep backup)"
  echo "2. Update netlify.toml to remove static fallback site"
  echo "3. Restore original ESLint configuration"
  echo "4. Re-enable React strict mode in next.config.js"
else
  echo "Intermediate ESLint checks failed. Please fix ESLint errors before restoring full architecture."
  exit 1
fi
