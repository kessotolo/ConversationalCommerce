#!/usr/bin/env node

/**
 * Lint Fixer Script
 *
 * This script automatically fixes common ESLint issues in the codebase:
 * 1. Removes unused imports
 * 2. Suggests proper typing for 'any' types
 * 3. Fixes React hook dependencies issues
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

console.log('\n🔧 Fixing ESLint issues throughout the codebase...');

// First, let's run ESLint with --fix to address auto-fixable issues
try {
  console.log('Running ESLint auto-fix...');
  execSync('npx eslint --fix "src/**/*.{ts,tsx,js,jsx}"', { cwd: ROOT_DIR });
  console.log('✅ ESLint auto-fix completed');
} catch (error) {
  console.log('⚠️ ESLint auto-fix completed with some remaining issues');
}

// Let's now manually fix common issues that ESLint's --fix can't handle
const files = glob.sync(path.join(SRC_DIR, '**/*.{ts,tsx,js,jsx}'));
let fixedFiles = 0;

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf-8');
  let hasChanges = false;

  // Fix 1: Remove unused imports
  // Strategy: Get all variable names in imports and check if they're used in the file

  const importRegex = /import\s+{([^}]*)}\s+from\s+['"]([^'"]+)['"]/g;
  let imports = [...content.matchAll(importRegex)];

  imports.forEach((importMatch) => {
    const importVariables = importMatch[1].split(',').map((v) => v.trim());
    const importSource = importMatch[2];
    const unusedImports = [];

    importVariables.forEach((variable) => {
      // Skip import if it contains 'as' or is a destructuring pattern
      if (variable.includes(' as ') || variable.includes(':')) return;

      // Create regex to find usages outside of import statements
      const usageRegex = new RegExp(`\\b${variable}\\b(?!.*from)`, 'g');
      const importSection = content.substring(0, importMatch.index + importMatch[0].length);
      const nonImportContent = content.substring(importMatch.index + importMatch[0].length);

      const usageCount = (nonImportContent.match(usageRegex) || []).length;
      if (usageCount === 0) {
        unusedImports.push(variable);
      }
    });

    if (unusedImports.length > 0) {
      // Remove unused imports
      const newImportVariables = importVariables.filter((v) => !unusedImports.includes(v));

      if (newImportVariables.length === 0) {
        // Remove the entire import if all variables are unused
        content = content.replace(importMatch[0], '');
      } else {
        // Update import with only used variables
        const newImport = `import { ${newImportVariables.join(', ')} } from '${importSource}'`;
        content = content.replace(importMatch[0], newImport);
      }

      hasChanges = true;
    }
  });

  // Fix 2: Improve 'any' types - we'll find common patterns and suggest better types
  // For this we'll add comments to guide the developer rather than making auto-fixes

  const anyTypeRegex = /: any(\s|[,\)]|$)/g;
  const anyMatches = [...content.matchAll(anyTypeRegex)];

  if (anyMatches.length > 0) {
    // Add a comment at the top of the file if it has any 'any' types
    const eslintDisableComment =
      '// TODO: Fix any types below (ESLint @typescript-eslint/no-explicit-any)';
    if (!content.includes(eslintDisableComment)) {
      const firstImportIndex = content.indexOf('import');
      if (firstImportIndex !== -1) {
        content =
          content.substring(0, firstImportIndex) +
          eslintDisableComment +
          '\n' +
          content.substring(firstImportIndex);
        hasChanges = true;
      }
    }
  }

  // Fix 3: React hook dependencies
  const hookRegex = /useEffect\(\(\)\s*=>\s*{[^}]*}\s*,\s*\[(.*?)\]\)/g;
  let newContent = content.replace(hookRegex, (match, dependencies) => {
    // Check for common missing dependencies: fetch functions, state setters
    if (match.includes('fetch') && !dependencies.includes('fetch')) {
      return match.replace(/\[(.*?)\]/, (depMatch, deps) => {
        const newDeps = deps ? deps + ', fetch' : 'fetch';
        return `[${newDeps}]`;
      });
    }
    return match;
  });

  if (newContent !== content) {
    content = newContent;
    hasChanges = true;
  }

  if (hasChanges) {
    fs.writeFileSync(file, content);
    console.log(`✅ Fixed linting issues in: ${path.relative(ROOT_DIR, file)}`);
    fixedFiles++;
  }
});

console.log(`\n🎉 Fixed linting issues in ${fixedFiles} files!`);
console.log('Run ESLint again to see if there are any remaining issues.');
console.log('Remember to fix the "any" types for improved type safety.');
