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

const SOURCE_DIR = path.resolve(__dirname, '../src');
const FIXED_COUNT = { count: 0 };

interface ImportReplacement {
  from: RegExp;
  to: string;
}

const IMPORT_REPLACEMENTS: ImportReplacement[] = [
  {
    from: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]@\/types\/events['"];?/g,
    to: 'import type {$1} from \'@/modules/core\';'
  },
  {
    from: /import\s+(?:type\s+)?{([^}]*)}\s+from\s+['"]@\/types\/websocket['"];?/g,
    to: 'import type {$1} from \'@/modules/core\';'
  },
  // Handle the function import case for isNotification
  {
    from: /import\s+{\s*isNotification\s*}\s+from\s+['"]@\/types\/websocket['"];?/g,
    to: 'import { isNotification } from \'@/modules/core\';'
  }
];

/**
 * Fixes imports in a single file
 */
function fixImportsInFile(filePath: string): void {
  let fileContent = fs.readFileSync(filePath, 'utf8');
  let wasModified = false;

  IMPORT_REPLACEMENTS.forEach(replacement => {
    if (replacement.from.test(fileContent)) {
      fileContent = fileContent.replace(replacement.from, replacement.to);
      wasModified = true;
      FIXED_COUNT.count++;
    }
  });

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
