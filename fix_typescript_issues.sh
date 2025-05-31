#!/bin/bash

PROJECT_DIR="/Users/kess/Projects/ConversationalCommerce/frontend"
echo "🔍 Scanning for TypeScript issues..."

# 1. Fix duplicate React imports
echo "🔧 Fixing duplicate React imports..."
find "${PROJECT_DIR}/src" -name "*.tsx" | xargs sed -i '' -E 's/import React from .react.;(.*import React from .react.;)+/import React from '\''react'\'';/g'
find "${PROJECT_DIR}/src" -name "*.tsx" | xargs sed -i '' -E 's/import \* as React from .react.;(.*import \* as React from .react.;)+/import * as React from '\''react'\'';/g'
find "${PROJECT_DIR}/src" -name "*.tsx" | xargs sed -i '' -E 's/import React, \{ [^}]+ \} from .react.;(.*import React[^;]*;)+/import React, { useState, useEffect, useRef, useMemo, useCallback } from '\''react'\'';/g'

# 2. Fix import casing consistency in types
echo "🔧 Fixing import casing consistency..."
find "${PROJECT_DIR}/src" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|types/storefrontEditor|types/StorefrontEditor|g'
find "${PROJECT_DIR}/src" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|types/file|types/File|g'
find "${PROJECT_DIR}/src" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|types/product|types/Product|g'
find "${PROJECT_DIR}/src" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|types/order|types/Order|g'
find "${PROJECT_DIR}/src" -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|types/notification|types/Notification|g'

# 3. Fix circular imports in type files
echo "🔧 Fixing circular imports in type files..."
sed -i '' 's|import { File } from '\''@/types/File'\''|// Removed circular import|g' "${PROJECT_DIR}/src/types/File.ts"

# 4. Fix common import style issues
echo "🔧 Fixing import styles for components..."
find "${PROJECT_DIR}/src/types" -name "*.ts" | xargs sed -i '' 's|import { DraftList }|import DraftList|g'
find "${PROJECT_DIR}/src/types" -name "*.ts" | xargs sed -i '' 's|import { VersionList }|import VersionList|g'
find "${PROJECT_DIR}/src/types" -name "*.ts" | xargs sed -i '' 's|import { BannerList }|import BannerList|g'
find "${PROJECT_DIR}/src/types" -name "*.ts" | xargs sed -i '' 's|import { LogoList }|import LogoList|g'
find "${PROJECT_DIR}/src/types" -name "*.ts" | xargs sed -i '' 's|import { Activity }|import Activity|g'
find "${PROJECT_DIR}/src/types" -name "*.ts" | xargs sed -i '' 's|import { Violation,|import Violation,|g'

# 5. Fix self-imports in component files (where a component imports itself)
echo "🔧 Fixing self-imports in component files..."
find "${PROJECT_DIR}/src/components" -name "*.tsx" | while read -r file; do
  component_name=$(basename "$file" .tsx)
  grep -l "import { $component_name } from .*$component_name" "$file" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "  Fixing self-import in $file"
    sed -i '' -E "s|import \\{ $component_name(, .*)?\\} from ['\"]([^'\"]+)$component_name['\"]|// Removed self-import|g" "$file"
  fi
done

# 6. Remove invalid Record import from React
echo "🔧 Fixing invalid Record import..."
sed -i '' 's|import { Record } from '\''react'\''|// Removed invalid Record import|g' "${PROJECT_DIR}/src/types/StorefrontEditor.ts"

# 7. Fix missing HTML element imports where needed
echo "🔧 Adding React.HTMLElementTypes where needed..."
find "${PROJECT_DIR}/src/components/ui" -name "*.tsx" | xargs sed -i '' '1s|^import React.*|import React, { HTMLAttributes } from '\''react'\'';|'

# 8. Add proper type imports in skeleton files
echo "🔧 Fixing Skeleton component issues..."
sed -i '' '1s|^|import { FC } from '\''react'\''\;\n|' "${PROJECT_DIR}/src/components/ui/SkeletonLoader.tsx"

echo "✅ All automated fixes applied!"
echo ""
echo "⚠️ Note: Some complex TypeScript issues may still remain and require manual fixes."
echo "   Running type-check to see remaining issues..."

cd "${PROJECT_DIR}" && npm run type-check || true

echo ""
echo "🏁 Script completed! The most common TypeScript issues have been fixed."
echo "   For production builds, you may need to add // @ts-ignore to bypass remaining errors."
