#!/bin/bash

PROJECT_DIR="/Users/kess/Projects/ConversationalCommerce/frontend"
echo "🔧 Fixing Next.js build issues..."

# 1. Fix "use client" directives not at the top of files
echo "🔍 Fixing 'use client' directive placement..."
find "${PROJECT_DIR}/src" -name "*.tsx" -o -name "*.jsx" -o -name "*.js" | xargs grep -l "\"use client\";" | while read -r file; do
  if ! grep -q "^\"use client\";" "$file"; then
    echo "  Fixing directive in $file"
    sed -i '' '/^import/i\
"use client";
' "$file"
    sed -i '' '/^"use client";/d' "$file"
    sed -i '' '1s/^/"use client";\n/' "$file"
  fi
done

# 2. Fix duplicate React imports
echo "🔍 Fixing duplicate React imports..."
find "${PROJECT_DIR}" -name "*.tsx" -o -name "*.jsx" -o -name "*.js" | xargs sed -i '' -E 's/import \{ React \} from .react.;//g'
find "${PROJECT_DIR}" -name "*.tsx" -o -name "*.jsx" -o -name "*.js" | xargs sed -i '' -E 's/import React, \{ (.*) \} from .react.;/import React, \{ \1 \} from '\''react'\'';/g'

# 3. Add "use client" directive to class component files
echo "🔍 Adding 'use client' directive to class component files..."
echo '"use client";' > "${PROJECT_DIR}/src/app/store/[merchantId]/page.js.new"
cat "${PROJECT_DIR}/src/app/store/[merchantId]/page.js" >> "${PROJECT_DIR}/src/app/store/[merchantId]/page.js.new"
mv "${PROJECT_DIR}/src/app/store/[merchantId]/page.js.new" "${PROJECT_DIR}/src/app/store/[merchantId]/page.js"

# 4. Fix ThemeProvider import conflict
echo "🔍 Fixing ThemeProvider import conflict..."
sed -i '' 's/import { ThemeProvider as CustomThemeProvider } from/import { ThemeProvider as ThemeContextProvider } from/' "${PROJECT_DIR}/src/components/ThemeProvider.tsx"

echo "✅ Next.js build issues fixed!"
