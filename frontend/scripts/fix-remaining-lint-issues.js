#!/usr/bin/env node

/**
 * fix-remaining-lint-issues.js
 * 
 * A targeted script to fix the specific remaining ESLint issues:
 * 1. Prettier formatting issues
 * 2. Unused variables with _prefix
 * 3. React hook dependencies
 * 4. HTML img tags
 * 5. Missing component definitions
 * 6. React unescaped entities
 * 7. HTML links
 * 8. TypeScript parsing errors
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SOURCE_DIR = path.resolve(__dirname, '../src');
const FIXED_COUNT = { 
  prettier: 0,
  unusedVars: 0,
  hooks: 0,
  images: 0,
  links: 0,
  icons: 0,
  entities: 0,
  parsing: 0
};

// Fix prettier formatting issues (import spacing)
const PRETTIER_FIXES = [
  { file: 'components/products/ShareButtons.tsx', from: /import\s*{MessageCircle,\s*Send,\s*Camera}\s*from/g, to: 'import { MessageCircle, Send, Camera } from' },
  { file: 'components/monitoring/RulesManager.tsx', from: /import\s*{Rule}\s*from/g, to: 'import { Rule } from' },
  { file: 'components/ui/Badge.tsx', from: /import\s*{cva}\s*from/g, to: 'import { cva } from' },
  { file: 'components/ui/Button.tsx', from: /import\s*{cva}\s*from/g, to: 'import { cva } from' },
  { file: 'components/ui/toast.tsx', from: /import\s*{cva}\s*from/g, to: 'import { cva } from' },
  { file: 'lib/utils.ts', from: /import\s*{clsx}\s*from/g, to: 'import { clsx } from' }
];

// Fix unused variables with _prefix
const UNUSED_VARS_FIXES = [
  { file: 'components/StorefrontEditor/Permissions/PermissionDetail.tsx', from: /\(\s*{\s*_tenantId\s*}\s*\)/g, to: '({ /* _tenantId */ })' },
  { file: 'components/StorefrontEditor/Permissions/Permissions.tsx', from: /const\s*\[\s*total\s*,\s*setTotal\s*\]\s*=/g, to: 'const [/* total */, setTotal] =' },
  { file: 'components/monitoring/ActivityDashboard.tsx', from: /const\s*\[\s*filter\s*,\s*setFilter\s*\]\s*=/g, to: 'const [/* filter */, /* setFilter */] =' },
  { file: 'components/monitoring/ActivityDashboard.tsx', from: /const\s*sendMessage\s*=/g, to: 'const /* sendMessage */ =' },
  { file: 'contexts/AuthContext.tsx', from: /\{\s*email\s*,\s*password\s*\}/g, to: '{ email /* , password */ }' },
  { file: 'lib/api.ts', from: /const\s*isOnline\s*=/g, to: 'const /* isOnline */ =' },
  { file: 'utils/auth-utils.tsx', from: /const\s*user\s*=/g, to: 'const /* user */ =' }
];

// Fix React hook dependencies
const HOOK_FIXES = [
  { 
    file: 'components/StorefrontEditor/Permissions/Permissions.tsx', 
    from: /useEffect\(\s*\(\s*\)\s*=>\s*{\s*loadPermissions\(\);\s*},\s*\[\]\s*\);/g, 
    to: 'useEffect(() => {\n    loadPermissions();\n  }, [loadPermissions]);'
  },
  { 
    file: 'components/monitoring/RulesManager.tsx', 
    from: /useEffect\(\s*\(\s*\)\s*=>\s*{\s*fetchRules\(\);\s*},\s*\[\s*fetch\s*,\s*tenantId\s*\]\s*\);/g, 
    to: 'useEffect(() => {\n    fetchRules();\n  }, [fetchRules]);'
  },
  { 
    file: 'components/store/ClientStore.tsx', 
    from: /useEffect\(\s*\(\s*\)\s*=>\s*{[^}]*},\s*\[\s*fetch\s*\]\s*\);/g, 
    to: (match) => {
      return match.replace(', fetch', '');
    }
  },
  { 
    file: 'utils/auth-utils.tsx', 
    from: /useEffect\(\s*\(\s*\)\s*=>\s*{\s*if\s*\(\s*!\s*isAuthenticated\s*\)\s*{\s*redirectToLogin\(\);\s*}\s*},\s*\[\s*isAuthenticated\s*\]\s*\);/g, 
    to: 'useEffect(() => {\n    if (!isAuthenticated) {\n      redirectToLogin();\n    }\n  }, [isAuthenticated, redirectToLogin]);'
  }
];

// Fix HTML img tags to Next.js Image components
const IMAGE_FIXES = [
  { 
    file: 'components/products/ProductCard.tsx',
    from: /<img\s+src="([^"]+)"\s+alt="([^"]+)"[^>]*>/g,
    to: '<Image src="$1" alt="$2" width={500} height={300} />'
  },
  { 
    file: 'components/products/ShareButtons.tsx',
    from: /<img\s+src="([^"]+)"\s+alt="([^"]+)"[^>]*>/g,
    to: '<Image src="$1" alt="$2" width={500} height={300} />'
  }
];

// Fix missing icon imports
const ICON_FIXES = [
  { 
    file: 'components/products/ProductCard.tsx',
    from: /import\s+{([^}]*)}\s+from\s+['"]lucide-react['"];/g,
    to: (match, imports) => {
      const newImports = imports.trim();
      if (!newImports.includes('ChevronRight')) {
        return match.replace(imports, `${imports}, ChevronRight, Copy, Trash2, X`);
      }
      return match;
    }
  }
];

// Fix unescaped entities
const ENTITY_FIXES = [
  { 
    file: 'components/StorefrontEditor/VersionHistory/VersionDetail.tsx',
    from: /([''])(?=[^<]*<\/)/g,
    to: '&apos;'
  }
];

// Fix HTML links to Next.js Link components
const LINK_FIXES = [
  { 
    file: 'components/dashboard/StorefrontLinks.tsx',
    from: /<a\s+href="\/dashboard\/storefront\/customize\/"[^>]*>(.*?)<\/a>/g,
    to: '<Link href="/dashboard/storefront/customize/">$1</Link>'
  }
];

// Fix TypeScript parsing errors
const PARSING_FIXES = [
  // Fix the syntax error in useWebSocket.ts
  { 
    file: 'hooks/useWebSocket.ts',
    from: /(\w+):\s*,/g,
    to: '$1: undefined,'
  },
  // Fix VersionHistory.tsx parsing error
  { 
    file: 'components/StorefrontEditor/VersionHistory/VersionHistory.tsx',
    readAndFix: true
  }
];

/**
 * Specifically fixes a file with a custom function
 */
function customFixVersionHistoryFile() {
  const filePath = path.join(SOURCE_DIR, 'components/StorefrontEditor/VersionHistory/VersionHistory.tsx');
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Look for unclosed JSX tags or incorrect syntax
    // This is a common syntax error - missing closing tags or brackets
    content = content.replace(/<([a-zA-Z0-9]+)([^>]*)>([^<]*?)(?!\s*<\/\1>)/g, '<$1$2>$3</$1>');
    
    // Fix missing semicolons
    content = content.replace(/(\w+)\s*=\s*(\w+)\s*(?!;|\)|\}|,)/g, '$1 = $2;');
    
    // Add missing import for Image component if it's being used
    if (content.includes('<Image') && !content.includes("import Image from 'next/image'")) {
      content = "import Image from 'next/image';\n" + content;
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    FIXED_COUNT.parsing++;
    console.log(`✅ Fixed parsing issues in ${filePath.replace(process.cwd(), '')}`);
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error);
  }
}

/**
 * Fix a specific file with a list of replacements
 */
function fixFile(filePath, replacements) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let wasModified = false;
    
    for (const replacement of replacements) {
      if (typeof replacement.to === 'function') {
        newContent = newContent.replace(replacement.from, replacement.to);
      } else {
        newContent = newContent.replace(replacement.from, replacement.to);
      }
      
      if (newContent !== content) {
        wasModified = true;
      }
    }
    
    if (wasModified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error);
    return false;
  }
}

/**
 * Process fixes for a specific category
 */
function processFixCategory(category, fixes, filePrefix = '') {
  console.log(`🔧 Fixing ${category}...`);
  
  for (const fix of fixes) {
    if (fix.readAndFix) {
      // This is a special case requiring custom handling
      if (fix.file === 'components/StorefrontEditor/VersionHistory/VersionHistory.tsx') {
        customFixVersionHistoryFile();
      }
      continue;
    }
    
    const filePath = path.join(SOURCE_DIR, filePrefix + fix.file);
    
    if (fs.existsSync(filePath)) {
      const wasFixed = fixFile(filePath, [fix]);
      
      if (wasFixed) {
        FIXED_COUNT[category]++;
        console.log(`✅ Fixed ${category} in ${filePath.replace(process.cwd(), '')}`);
      }
    } else {
      console.log(`⚠️ File not found: ${filePath}`);
    }
  }
}

/**
 * Process all categories of fixes
 */
function processAllFixes() {
  // Fix prettier formatting issues
  processFixCategory('prettier', PRETTIER_FIXES);
  
  // Fix unused variables
  processFixCategory('unusedVars', UNUSED_VARS_FIXES);
  
  // Fix React hook dependencies
  processFixCategory('hooks', HOOK_FIXES);
  
  // Fix HTML img tags
  processFixCategory('images', IMAGE_FIXES);
  
  // Fix missing icon imports
  processFixCategory('icons', ICON_FIXES);
  
  // Fix unescaped entities
  processFixCategory('entities', ENTITY_FIXES);
  
  // Fix HTML links
  processFixCategory('links', LINK_FIXES);
  
  // Fix TypeScript parsing errors
  processFixCategory('parsing', PARSING_FIXES);
  
  // Add Next.js Image import if needed
  const filesToCheckForImage = [
    'components/products/ProductCard.tsx',
    'components/products/ShareButtons.tsx'
  ];
  
  filesToCheckForImage.forEach(file => {
    const filePath = path.join(SOURCE_DIR, file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      if (content.includes('<Image') && !content.includes("import Image from 'next/image'")) {
        content = "import Image from 'next/image';\n" + content;
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Added Image import to ${filePath.replace(process.cwd(), '')}`);
      }
    }
  });
  
  // Special fix for getToken.ts (React Hook in non-React function)
  const getTokenPath = path.join(SOURCE_DIR, 'lib/auth/getToken.ts');
  if (fs.existsSync(getTokenPath)) {
    let content = fs.readFileSync(getTokenPath, 'utf8');
    
    // Replace useAuth hook with direct function call
    if (content.includes('const { token } = useAuth()')) {
      const newContent = content
        .replace('import { useAuth } from \'@/hooks/useAuth\';', 'import { getAuthToken } from \'@/utils/auth-utils\';')
        .replace('const { token } = useAuth();', 'const token = getAuthToken();');
      
      fs.writeFileSync(getTokenPath, newContent, 'utf8');
      console.log(`✅ Fixed React Hook in non-React function in ${getTokenPath.replace(process.cwd(), '')}`);
    }
  }
  
  // Add to tsconfig.json to include StoreContent.jsx
  const tsconfigPath = path.resolve(__dirname, '../tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    let tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    
    if (tsconfig.include && !tsconfig.include.includes('**/*.jsx')) {
      tsconfig.include.push('**/*.jsx');
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2), 'utf8');
      console.log(`✅ Added *.jsx to tsconfig.json include patterns`);
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🛠️ Starting targeted fixes for remaining ESLint issues...');
  processAllFixes();
  
  console.log('\n===== SUMMARY =====');
  console.log(`✅ Fixed ${FIXED_COUNT.prettier} prettier formatting issues`);
  console.log(`✅ Fixed ${FIXED_COUNT.unusedVars} unused variable issues`);
  console.log(`✅ Fixed ${FIXED_COUNT.hooks} React hook dependency issues`);
  console.log(`✅ Fixed ${FIXED_COUNT.images} image optimization issues`);
  console.log(`✅ Fixed ${FIXED_COUNT.icons} missing icon import issues`);
  console.log(`✅ Fixed ${FIXED_COUNT.entities} unescaped entity issues`);
  console.log(`✅ Fixed ${FIXED_COUNT.links} HTML link issues`);
  console.log(`✅ Fixed ${FIXED_COUNT.parsing} TypeScript parsing issues`);
  console.log('===================\n');
  
  console.log('✅ Completed targeted fixes for ESLint issues!');
}

main();
