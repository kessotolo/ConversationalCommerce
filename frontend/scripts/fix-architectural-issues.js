#!/usr/bin/env node

/**
 * fix-architectural-issues.js
 * 
 * A script to fix remaining architectural issues in the codebase:
 * 1. Relative imports -> absolute imports with @/ alias
 * 2. Imports from internal module files -> public API imports
 * 3. HTML elements -> Next.js components
 * 
 * This script is part of the architectural cleanup to enforce module boundaries
 * and eliminate technical debt in the ConversationalCommerce project.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const glob = require('glob');

const SOURCE_DIR = path.resolve(__dirname, '../src');
const FIXED_COUNT = { 
  imports: 0,
  components: 0,
  modules: 0
};

// Fix relative imports in layout components
const LAYOUT_IMPORTS = [
  {
    pattern: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]\.\/MobileNav['"];?/g,
    replacement: 'import {$1} from \'@/components/layout/MobileNav\';'
  },
  {
    pattern: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]\.\/Sidebar['"];?/g,
    replacement: 'import {$1} from \'@/components/layout/Sidebar\';'
  }
];

// Fix module-related imports
const MODULE_IMPORTS = [
  // Fix lib/api.ts imports
  {
    pattern: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]\.\/api\/types['"];?/g,
    replacement: 'import type {$1} from \'@/modules/core\';'
  },
  // Fix storefrontEditor.ts imports
  {
    pattern: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]\.\/storefrontEditor\.types['"];?/g,
    replacement: 'import type {$1} from \'@/modules/storefront\';'
  },
  // Fix cart module imports
  {
    pattern: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]\.\/CartService['"];?/g,
    replacement: 'import {$1} from \'@/modules/cart\';'
  },
  {
    pattern: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]\.\/services['"];?/g,
    replacement: 'import {$1} from \'@/modules/cart\';'
  }
];

// Fix HTML <a> to Next.js <Link>
const COMPONENT_IMPORTS = [
  {
    pattern: /<a\s+href=["']\/dashboard\/storefront\/customize\/["'](.*?)>(.*?)<\/a>/g,
    replacement: '<Link href="/dashboard/storefront/customize/"$1>$2</Link>'
  },
  {
    // Add Link import if using Link component but not importing it
    pattern: /<Link\s+/g,
    checkAndReplace: (content, match) => {
      if (!content.includes('import Link from \'next/link\';')) {
        return {
          pattern: /^/,
          replacement: 'import Link from \'next/link\';\n\n'
        };
      }
      return null;
    }
  },
  {
    // Fix img to Next.js Image
    pattern: /<img\s+src=["'](.*?)["']\s+alt=["'](.*?)["'](.*?)>/g,
    replacement: '<Image src="$1" alt="$2" width={500} height={300} $3 />'
  },
  {
    // Add Image import if using Image component but not importing it
    pattern: /<Image\s+/g,
    checkAndReplace: (content, match) => {
      if (!content.includes('import Image from \'next/image\';')) {
        return {
          pattern: /^/,
          replacement: 'import Image from \'next/image\';\n\n'
        };
      }
      return null;
    }
  }
];

/**
 * Fixes imports in a single file
 */
function fixImportsInFile(filePath) {
  let fileContent = fs.readFileSync(filePath, 'utf8');
  let wasModified = false;
  
  // Fix layout imports
  LAYOUT_IMPORTS.forEach(({ pattern, replacement }) => {
    const newContent = fileContent.replace(pattern, replacement);
    if (newContent !== fileContent) {
      fileContent = newContent;
      wasModified = true;
      FIXED_COUNT.imports++;
    }
  });
  
  // Fix module imports
  MODULE_IMPORTS.forEach(({ pattern, replacement }) => {
    const newContent = fileContent.replace(pattern, replacement);
    if (newContent !== fileContent) {
      fileContent = newContent;
      wasModified = true;
      FIXED_COUNT.modules++;
    }
  });
  
  // Fix component imports and add missing imports
  COMPONENT_IMPORTS.forEach(({ pattern, replacement, checkAndReplace }) => {
    if (checkAndReplace) {
      // This is a special pattern that might need dynamic replacement
      if (pattern.test(fileContent)) {
        const dynamicReplacement = checkAndReplace(fileContent, pattern);
        if (dynamicReplacement) {
          const newContent = fileContent.replace(
            dynamicReplacement.pattern, 
            dynamicReplacement.replacement
          );
          if (newContent !== fileContent) {
            fileContent = newContent;
            wasModified = true;
            FIXED_COUNT.components++;
          }
        }
      }
    } else if (replacement) {
      // Standard replacement
      const newContent = fileContent.replace(pattern, replacement);
      if (newContent !== fileContent) {
        fileContent = newContent;
        wasModified = true;
        FIXED_COUNT.components++;
      }
    }
  });
  
  if (wasModified) {
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`✅ Fixed imports in ${filePath.replace(process.cwd(), '')}`);
  }
}

/**
 * Process all files in the project
 */
function processAllFiles() {
  // Find all TypeScript and JavaScript files
  const files = glob.sync(path.join(SOURCE_DIR, '**/*.{ts,tsx,js,jsx}'));
  
  console.log(`🔍 Found ${files.length} files to process`);
  
  // Process each file
  files.forEach(file => {
    try {
      fixImportsInFile(file);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  });
  
  console.log('\n===== SUMMARY =====');
  console.log(`✅ Fixed ${FIXED_COUNT.imports} layout component imports`);
  console.log(`✅ Fixed ${FIXED_COUNT.modules} module imports`);
  console.log(`✅ Fixed ${FIXED_COUNT.components} component/HTML issues`);
  console.log('===================\n');
}

// Main execution
console.log('🛠️ Starting fix of architectural import issues...');
processAllFiles();
console.log('✅ Completed fixing architectural issues!');
