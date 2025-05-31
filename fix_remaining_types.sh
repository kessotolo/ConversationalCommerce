#!/bin/bash

# This script fixes remaining TypeScript issues:
# 1. Standardizes file imports with correct casing
# 2. Fixes import style for components (default vs named)

PROJECT_DIR="/Users/kess/Projects/ConversationalCommerce/frontend"

echo "Fixing type file casing issues..."

# Fix type imports with inconsistent casing
files=(
  "src/types/Notification.ts"
  "src/types/Order.ts"
  "src/types/Product.ts"
)

for file in "${files[@]}"; do
  filepath="${PROJECT_DIR}/${file}"
  echo "Fixing imports in $filepath"
  
  # Get the base filename without extension
  basename=$(basename "$file" .ts)
  lowercase=$(echo "$basename" | tr '[:upper:]' '[:lower:]')
  
  # Replace imports using lowercase with proper casing
  sed -i '' "s|@/types/${lowercase}|@/types/${basename}|g" "$filepath"
done

# Fix StorefrontEditor.ts issues
echo "Fixing StorefrontEditor.ts issues..."
sed -i '' "s|import { Record } from 'react';|// Removed invalid Record import|" "${PROJECT_DIR}/src/types/StorefrontEditor.ts"
sed -i '' "s|import { DraftList }|import DraftList|" "${PROJECT_DIR}/src/types/StorefrontEditor.ts"
sed -i '' "s|import { VersionList }|import VersionList|" "${PROJECT_DIR}/src/types/StorefrontEditor.ts"
sed -i '' "s|import { BannerList }|import BannerList|" "${PROJECT_DIR}/src/types/StorefrontEditor.ts"
sed -i '' "s|import { LogoList }|import LogoList|" "${PROJECT_DIR}/src/types/StorefrontEditor.ts"

# Fix Violation.ts issues
echo "Fixing Violation.ts issues..."
sed -i '' "s|import { Violation, ViolationStats, ViolationTrend }|import Violation, { ViolationStats, ViolationTrend }|" "${PROJECT_DIR}/src/types/Violation.ts"

echo "All fixes applied. Running type-check to verify..."
cd "${PROJECT_DIR}" && npm run type-check
