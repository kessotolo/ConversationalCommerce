#!/usr/bin/env node

/**
 * fix-bridge-imports.ts
 *
 * A script to replace imports from the legacy bridge pattern files
 * with imports from the core module.
 *
 * This script is part of Phase 3 architectural cleanup to enforce module boundaries
 * and eliminate bridge pattern technical debt.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { fileURLToPath } from 'url';

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.resolve(__dirname, '../src');
const FIXED_COUNT = { count: 0 };

interface ImportReplacement {
  from: RegExp;
  to: string;
}

// --- Type Mapping Table for Storefront Editor Types ---
const TYPE_TO_MODULE_MAP: Record<string, string> = {
  // Storefront types
  'Asset': '@/modules/storefront/models/asset',
  'Banner': '@/modules/storefront/models/banner',
  'Logo': '@/modules/storefront/models/logo',
  'Draft': '@/modules/storefront/models/draft',
  'Version': '@/modules/storefront/models/version',
  'VersionDiff': '@/modules/storefront/models/version',
  'Permission': '@/modules/storefront/models/permission',
  'UserPermission': '@/modules/storefront/models/permission',
  'StorefrontRole': '@/modules/storefront/models/permission',
  'StorefrontSectionType': '@/modules/storefront/models/permission',
  // Core types
  'UUID': '@/modules/core/models/base',
  // Monitoring types
  'Rule': '@/modules/monitoring/models/rule',
  // Theme types
  'Theme': '@/modules/theme/models/theme',
  // Add more mappings as needed
};

// --- Import Replacement Patterns ---
const IMPORT_REPLACEMENTS: ImportReplacement[] = [
  // Core module types
  {
    from: /import\s+(?:type\s+)?{\s*UUID\s*}\s+from\s+['"]@\/modules\/core\/types['"];?/g,
    to: 'import type { UUID } from "@/modules/core/models/base";'
  },
  // Storefront module types (single)
  {
    from: /import\s+(?:type\s+)?{\s*(StorefrontRole|UserPermission)\s*}\s+from\s+['"]@\/modules\/storefront\/types['"];?/g,
    to: 'import type { $1 } from "@/modules/storefront/models/permission";'
  },
  // Monitoring module types
  {
    from: /import\s+(?:type\s+)?{\s*(Rule)\s*}\s+from\s+['"]@\/modules\/monitoring\/types['"];?/g,
    to: 'import type { $1 } from "@/modules/monitoring/models/rule";'
  },
  // Theme module types
  {
    from: /import\s+(?:type\s+)?{\s*(Theme)\s*}\s+from\s+['"]@\/modules\/theme\/types['"];?/g,
    to: 'import type { $1 } from "@/modules/theme/models/theme";'
  },
  // Cart module types
  {
    from: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]@\/modules\/cart\/types['"];?/g,
    to: 'import type {$1} from "@/modules/cart/models/cart";'
  },
  // API type bridges
  {
    from: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]@\/lib\/api\/types['"];?/g,
    to: 'import type {$1} from "@/modules/core";'
  },
  // ... (add more as needed)
];

// --- Special Handler for storefrontEditor.types ---
function processStorefrontEditorImports(fileContent: string): string {
  const importRegex = /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]@\/lib\/api\/storefrontEditor\.types['"];?/g;
  let matches;
  let modifiedContent = fileContent;
  let importReplacements: Map<string, Set<string>> = new Map();

  // Process each import statement
  while ((matches = importRegex.exec(fileContent)) !== null) {
    const importBlock = matches[0];
    const importedTypes = matches[1].split(',').map(t => t.trim());

    // Group types by their target module
    importedTypes.forEach(typeName => {
      const typeKey = typeName.split(' as ')[0].trim();
      const modulePath = TYPE_TO_MODULE_MAP[typeKey] || '@/modules/storefront/models';
      if (!importReplacements.has(modulePath)) {
        importReplacements.set(modulePath, new Set());
      }
      importReplacements.get(modulePath)?.add(typeName);
    });

    // Remove the original import
    modifiedContent = modifiedContent.replace(importBlock, '');
  }

  // Add the new imports at the top
  if (importReplacements.size > 0) {
    let newImports = '';
    importReplacements.forEach((types, modulePath) => {
      newImports += `import type { ${Array.from(types).join(', ')} } from '${modulePath}';\n`;
    });
    // Insert at the top after existing imports
    const importEndIndex = modifiedContent.search(/^(?!import).+$/m);
    modifiedContent = modifiedContent.substring(0, importEndIndex) + newImports + modifiedContent.substring(importEndIndex);
  }
  return modifiedContent;
}

/**
 * Fixes imports in a single file
 */
function fixImportsInFile(filePath: string): void {
  let fileContent = fs.readFileSync(filePath, 'utf8');
  let wasModified = false;

  // Handle storefrontEditor.types imports specially
  if (fileContent.includes('@/lib/api/storefrontEditor.types')) {
    const newContent = processStorefrontEditorImports(fileContent);
    if (newContent !== fileContent) {
      fileContent = newContent;
      wasModified = true;
      FIXED_COUNT.count++;
    }
  }

  // Handle other bridge pattern imports (string-based only)
  IMPORT_REPLACEMENTS.forEach(replacement => {
    if (replacement.from.test(fileContent)) {
      fileContent = fileContent.replace(replacement.from, replacement.to);
      wasModified = true;
      FIXED_COUNT.count++;
    }
  });

  // Handle multi-type storefront bridge imports (function-based replacement)
  const storefrontTypesRegex = /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]@\/modules\/storefront\/types['"];?/g;
  if (storefrontTypesRegex.test(fileContent)) {
    fileContent = fileContent.replace(storefrontTypesRegex, (match, types) => {
      return types.split(',').map(type => {
        const typeName = type.trim().split(' as ')[0];
        const modulePath = TYPE_TO_MODULE_MAP[typeName] || '@/modules/storefront/models';
        return `import type { ${type.trim()} } from '${modulePath}';`;
      }).join('\n');
    });
    wasModified = true;
    FIXED_COUNT.count++;
  }

  if (wasModified) {
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`✅ Fixed imports in: ${filePath}`);
  }
}

/**
 * Processes all TypeScript and TSX files
 */
function processAllFiles(): void {
  const files = glob.sync(`${SOURCE_DIR}/**/*.{ts,tsx}`);
  console.log(`🔍 Scanning ${files.length} TypeScript files for bridge pattern imports...`);

  files.forEach(filePath => {
    fixImportsInFile(filePath);
  });

  console.log(`\n✨ Complete! Fixed imports in ${FIXED_COUNT.count} files.`);
}

// Execute the script
processAllFiles();
