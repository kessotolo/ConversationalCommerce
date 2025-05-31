#!/bin/bash

# This script fixes file casing issues in the ConversationalCommerce project
# It directly modifies import references without trying to rename files

echo "🔍 Fixing casing issues in imports..."

# Update imports in TypeScript files to consistently use lowercase paths
# This aligns with the modular monolith architecture pattern for path consistency

echo "📝 Normalizing import paths to lowercase..."
find frontend/src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs sed -i '' 's/@\/lib\/Api/@\/lib\/api/g'
find frontend/src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs sed -i '' 's/@\/lib\/Cart/@\/lib\/cart/g'

echo "✨ All import references have been normalized!"
