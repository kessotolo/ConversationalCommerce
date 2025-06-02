#!/usr/bin/env node

/**
 * fix-remaining-issues.ts
 *
 * A comprehensive script to fix remaining architectural and linting issues:
 * 1. Relative imports -> absolute imports with @/ alias
 * 2. Import from internal module files -> public API imports
 * 3. HTML img tags -> Next.js Image components
 * 4. Unused variables and imports
 * 5. React hook dependency issues
 *
 * This script is part of the architectural cleanup to enforce module boundaries
 * and eliminate technical debt.
 */

import * as fs from 'fs';
import * as path from 'path';
import glob from 'glob';

const SOURCE_DIR = path.resolve(__dirname, '../src');
const FIXED_COUNT = {
  imports: 0,
  components: 0,
  hooks: 0,
  unused: 0,
  images: 0,
};

interface Replacement {
  from: RegExp;
  to: string | ((match: string, arg1?: string) => string);
}

// Fix relative imports to use @/ alias
const RELATIVE_IMPORT_REPLACEMENTS: Replacement[] = [
  // Fix relative imports in layout components
  {
    from: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]\.\/MobileNav['"];?/g,
    to: "import {$1} from '@/components/layout/MobileNav';",
  },
  {
    from: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]\.\/Sidebar['"];?/g,
    to: "import {$1} from '@/components/layout/Sidebar';",
  },
  // Fix other relative imports within components
  {
    from: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]\.\.\/(.*?)['"];?/g,
    to: "import {$1} from '@/components/$2';",
  },
  {
    from: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]\.\/(.*?)['"];?/g,
    to: "import {$1} from '@/components/$2';",
  },
];

// Fix module-related imports
const MODULE_IMPORT_REPLACEMENTS: Replacement[] = [
  // Fix lib/api.ts imports
  {
    from: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]\.\/api\/types['"];?/g,
    to: "import type {$1} from '@/modules/core';",
  },
  // Fix storefrontEditor.ts imports
  {
    from: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]\.\/storefrontEditor\.types['"];?/g,
    to: "import type {$1} from '@/modules/storefront';",
  },
  // Fix cart module imports
  {
    from: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]\.\/CartService['"];?/g,
    to: "import {$1} from '@/modules/cart';",
  },
  {
    from: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]\.\/services['"];?/g,
    to: "import {$1} from '@/modules/cart';",
  },
];

// Fix HTML <a> to Next.js <Link>
const LINK_COMPONENT_REPLACEMENTS: Replacement[] = [
  {
    from: /<a\s+href=["']\/dashboard\/storefront\/customize\/["'](.*?)>(.*?)<\/a>/g,
    to: '<Link href="/dashboard/storefront/customize/"$1>$2</Link>',
  },
];

// Fix HTML <img> to Next.js <Image>
const IMAGE_COMPONENT_REPLACEMENTS: Replacement[] = [
  {
    from: /<img\s+src=["'](.*?)["']\s+alt=["'](.*?)["'](.*?)>/g,
    to: '<Image src="$1" alt="$2" width={500} height={300} $3 />',
  },
];

// Fix React hook dependencies
const HOOK_DEPENDENCY_REPLACEMENTS: Replacement[] = [
  // Pattern to find useEffect with empty dependency array that should include a function
  {
    from: /useEffect\(\(\)\s+=>\s+{\s+loadPermissions\(\);\s+},\s+\[\]\);/g,
    to: 'useEffect(() => {\n    loadPermissions();\n  }, [loadPermissions]);',
  },
  {
    from: /useEffect\(\(\)\s+=>\s+{\s+loadVersions\(\);\s+},\s+\[\]\);/g,
    to: 'useEffect(() => {\n    loadVersions();\n  }, [loadVersions]);',
  },
  {
    from: /useEffect\(\(\)\s+=>\s+{\s+fetchRules\(\);\s+},\s+\[\]\);/g,
    to: 'useEffect(() => {\n    fetchRules();\n  }, [fetchRules]);',
  },
  {
    from: /useEffect\(\(\)\s+=>\s+{\s+.*?redirectToLogin\(\).*?\s+},\s+\[\]\);/g,
    to: 'useEffect(() => {\n    if (!isAuthenticated) redirectToLogin();\n  }, [isAuthenticated, redirectToLogin]);',
  },
  // Remove fetch from dependencies
  {
    from: /useEffect\(\(\)\s+=>\s+{.*?},\s+\[.*?fetch.*?\]\);/g,
    to: (match: string): string => {
      return match.replace(/,\s*fetch/, '');
    },
  },
];

// Fix unused imports and variables
type ReplaceFunction = (match: string, content: string, fileContent: string) => string;

const UNUSED_IMPORTS_REPLACEMENTS: (Omit<Replacement, 'to'> & { to: string | ReplaceFunction })[] =
  [
    {
      from: /import\s+{\s*([^}]+)\s*}\s+from\s+['"](.*)['"];?\n/g,
      to: '',
    },
    {
      from: /import\s+{[^}]*?UserPlusIcon[^}]*?}\s+from\s+['"].*?['"];?\n/g,
      to: '',
    },
    {
      from: /import\s+{[^}]*?Copy[^}]*?}\s+from\s+['"].*?['"];?\n/g,
      to: '',
    },
    {
      from: /import\s+{[^}]*?Link[^}]*?}\s+from\s+['"].*?['"];?\n/g,
      to: '',
    },
    {
      from: /import\s+{[^}]*?Status[^}]*?}\s+from\s+['"].*?['"];?\n/g,
      to: '',
    },
    {
      from: /import\s+{[^}]*?DraftsResponse[^}]*?}\s+from\s+['"].*?['"];?\n/g,
      to: '',
    },
    {
      from: /import\s+{[^}]*?compareVersions[^}]*?}\s+from\s+['"].*?['"];?\n/g,
      to: '',
    },
    {
      from: /import\s+{[^}]*?RuleCondition[^}]*?}\s+from\s+['"].*?['"];?\n/g,
      to: '',
    },
    {
      from: /import\s+axios\s+from\s+['"]axios['"];?\n/g,
      to: '',
    },
    // Add Import statements that might be missing
    {
      from: /import\s+{\s*([^}]+)\s*}\s+from\s+['"](.*)['"];?/g,
      to: (match: string, content: string, fileContent: string): string => {
        if (!fileContent.includes("import Link from 'next/link';")) {
          return "import Link from 'next/link';\n\n" + match;
        }
        return match;
      },
    },
    {
      from: /<Link\s+/g,
      to: (match: string, content: string, fileContent: string): string => {
        if (!fileContent.includes("import Link from 'next/link';")) {
          return "import Link from 'next/link';\n\n" + match;
        }
        return match;
      },
    },
    {
      from: /<Image\s+/g,
      to: (match: string, content: string, fileContent: string): string => {
        if (!fileContent.includes("import Image from 'next/image';")) {
          return "import Image from 'next/image';\n\n" + match;
        }
        return match;
      },
    },
  ];

// Fix unescaped entities
const ENTITY_REPLACEMENTS: Replacement[] = [
  {
    from: /(['"])(.*?)[']/g,
    to: '$1$2&apos;',
  },
  {
    from: /(['"](.*?)["])/g,
    to: '$1$2&quot;',
  },
];

/**
 * Fixes issues in a single file
 */
function fixIssuesInFile(filePath: string): void {
  let fileContent = fs.readFileSync(filePath, 'utf8');
  let wasModified = false;

  // Fix relative imports
  RELATIVE_IMPORT_REPLACEMENTS.forEach((replacement) => {
    const newContent = fileContent.replace(replacement.from, (match, ...args) => {
      return typeof replacement.to === 'function' ? replacement.to(match, ...args) : replacement.to;
    });
    if (newContent !== fileContent) {
      fileContent = newContent;
      wasModified = true;
      FIXED_COUNT.imports++;
    }
  });

  // Fix module imports
  MODULE_IMPORT_REPLACEMENTS.forEach((replacement) => {
    const newContent = fileContent.replace(replacement.from, (match, ...args) => {
      return typeof replacement.to === 'function' ? replacement.to(match, ...args) : replacement.to;
    });
    if (newContent !== fileContent) {
      fileContent = newContent;
      wasModified = true;
      FIXED_COUNT.imports++;
    }
  });

  // Fix Link components
  LINK_COMPONENT_REPLACEMENTS.forEach((replacement) => {
    const newContent = fileContent.replace(replacement.from, (match, ...args) => {
      return typeof replacement.to === 'function' ? replacement.to(match, ...args) : replacement.to;
    });
    if (newContent !== fileContent) {
      fileContent = newContent;
      wasModified = true;
      FIXED_COUNT.components++;
    }
  });

  // Fix Image components
  IMAGE_COMPONENT_REPLACEMENTS.forEach((replacement) => {
    const newContent = fileContent.replace(replacement.from, (match, ...args) => {
      return typeof replacement.to === 'function' ? replacement.to(match, ...args) : replacement.to;
    });
    if (newContent !== fileContent) {
      fileContent = newContent;
      wasModified = true;
      FIXED_COUNT.images++;
    }
  });

  // Fix hook dependencies
  HOOK_DEPENDENCY_REPLACEMENTS.forEach((replacement) => {
    const newContent = fileContent.replace(replacement.from, (match, ...args) => {
      return typeof replacement.to === 'function' ? replacement.to(match, ...args) : replacement.to;
    });
    if (newContent !== fileContent) {
      fileContent = newContent;
      wasModified = true;
      FIXED_COUNT.hooks++;
    }
  });

  // Fix unused imports and variables
  UNUSED_IMPORTS_REPLACEMENTS.forEach((replacement) => {
    let newContent;
    if (typeof replacement.to === 'function') {
      newContent = fileContent.replace(replacement.from, (match: string, arg1: string) => {
        return (replacement.to as ReplaceFunction)(match, arg1, fileContent);
      });
    } else {
      newContent = fileContent.replace(replacement.from, replacement.to as string);
    }

    if (newContent !== fileContent) {
      fileContent = newContent;
      wasModified = true;
      FIXED_COUNT.unused++;
    }
  });

  // Fix unescaped entities if this is a TSX file
  if (filePath.endsWith('.tsx')) {
    ENTITY_REPLACEMENTS.forEach((replacement) => {
      const newContent = fileContent.replace(replacement.from, replacement.to);
      if (newContent !== fileContent) {
        fileContent = newContent;
        wasModified = true;
      }
    });
  }

  if (wasModified) {
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`✅ Fixed issues in ${filePath.replace(process.cwd(), '')}`);
  }
}

/**
 * Processes all files in the project
 */
function processAllFiles(): void {
  // Use glob to find all TypeScript and JavaScript files
  const files = glob.sync(path.join(SOURCE_DIR, '**/*.{ts,tsx,js,jsx}'));

  console.log(`🔍 Found ${files.length} files to process`);

  // Process each file
  files.forEach((file) => {
    try {
      fixIssuesInFile(file);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  });

  console.log('\n===== SUMMARY =====');
  console.log(`✅ Fixed ${FIXED_COUNT.imports} import issues`);
  console.log(`✅ Fixed ${FIXED_COUNT.components} component issues`);
  console.log(`✅ Fixed ${FIXED_COUNT.hooks} React hook issues`);
  console.log(`✅ Fixed ${FIXED_COUNT.unused} unused variable/import issues`);
  console.log(`✅ Fixed ${FIXED_COUNT.images} image optimization issues`);
  console.log('===================\n');
}

// Main execution
console.log('🛠️ Starting comprehensive fix of remaining issues...');
processAllFiles();
console.log('✅ Completed fixing remaining issues!');
