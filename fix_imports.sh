#!/bin/bash

# This script fixes import paths with incorrect casing
# It replaces "types/storefrontEditor" with "types/StorefrontEditor"
# and "lib/api/storefrontEditor" with "lib/api/StorefrontEditor"

# List of files to update
files=(
  "frontend/src/components/StorefrontEditor/AssetManagement/AssetGrid.tsx"
  "frontend/src/components/StorefrontEditor/BannerLogoManagement/LogoList.tsx"
  "frontend/src/components/StorefrontEditor/Permissions/PermissionList.tsx"
  "frontend/src/components/StorefrontEditor/BannerLogoManagement/LogoManagement.tsx"
  "frontend/src/components/StorefrontEditor/AssetManagement/AssetDetails.tsx"
  "frontend/src/components/StorefrontEditor/BannerLogoManagement/CreateBannerModal.tsx"
  "frontend/src/components/StorefrontEditor/BannerLogoManagement/BannerLogoManagement.tsx"
  "frontend/src/components/StorefrontEditor/BannerLogoManagement/BannerDetail.tsx"
  "frontend/src/components/StorefrontEditor/AssetManagement/AssetFilterBar.tsx"
  "frontend/src/components/StorefrontEditor/BannerLogoManagement/BannerList.tsx"
  "frontend/src/components/StorefrontEditor/BannerLogoManagement/CreateLogoModal.tsx"
  "frontend/src/components/StorefrontEditor/BannerLogoManagement/LogoDetail.tsx"
)

# Check for lib/api imports with incorrect casing too
grep -l "import.*lib/api/storefrontEditor" frontend/src/components/StorefrontEditor/**/*.tsx | while read -r file; do
  if [[ ! " ${files[@]} " =~ " ${file#/Users/kess/Projects/ConversationalCommerce/} " ]]; then
    files+=("${file#/Users/kess/Projects/ConversationalCommerce/}")
  fi
done

# Directory to search in
PROJECT_DIR="/Users/kess/Projects/ConversationalCommerce"

# For each file
for file in "${files[@]}"; do
  filepath="${PROJECT_DIR}/${file}"
  echo "Fixing imports in $filepath"
  
  # Fix type imports
  sed -i '' 's|types/storefrontEditor|types/StorefrontEditor|g' "$filepath"
  
  # Fix API imports
  sed -i '' 's|lib/api/storefrontEditor|lib/api/StorefrontEditor|g' "$filepath"
done

echo "Import paths have been fixed in all files."
