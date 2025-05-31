#!/bin/bash

# This script fixes file casing issues in the ConversationalCommerce project
# It addresses import path mismatches where files are imported with incorrect casing

echo "🔍 Scanning for file casing issues..."

# Create a list of file paths to normalize
declare -a files_to_fix=(
  "frontend/src/lib/Api.ts:frontend/src/lib/api.ts" 
  "frontend/src/lib/Cart.ts:frontend/src/lib/cart.ts"
)

# Fix each file
for file_pair in "${files_to_fix[@]}"; do
  source_file=$(echo $file_pair | cut -d':' -f1)
  target_file=$(echo $file_pair | cut -d':' -f2)
  
  # Check if source file exists
  if [ -f "$source_file" ]; then
    echo "Fixing file casing: $source_file → $target_file"
    
    # Create target directory if it doesn't exist
    target_dir=$(dirname "$target_file")
    mkdir -p "$target_dir"
    
    # Use git mv to properly track the case change
    git mv -f "$source_file" "$source_file.tmp"
    git mv -f "$source_file.tmp" "$target_file"
    
    echo "✅ Fixed: $source_file → $target_file"
  else
    echo "⚠️ Source file not found: $source_file"
  fi
done

# Update imports in TypeScript files to match new casing
echo "📝 Updating import references..."

find frontend/src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs sed -i '' 's/@\/lib\/Api/@\/lib\/api/g'
find frontend/src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs sed -i '' 's/@\/lib\/Cart/@\/lib\/cart/g'

echo "✨ All file casing issues have been fixed!"
