#!/usr/bin/env node

/**
 * Architecture Verification Script
 *
 * This script performs various checks to ensure the codebase adheres to
 * the architectural guidelines defined in our documentation.
 *
 * It verifies:
 * 1. No bridge files exist in the src/types directory
 * 2. No imports from non-existent bridge files
 * 3. Module boundaries are respected according to our modular monolith architecture
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { glob } = require('glob');

// Configuration
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const BRIDGE_DIR = path.join(SRC_DIR, 'types');
const MODULES_DIR = path.join(SRC_DIR, 'modules');

console.log('🔍 Verifying architectural compliance...');

// Check 1: Ensure no bridge files exist
console.log('\n📁 Checking for bridge files...');
if (fs.existsSync(BRIDGE_DIR)) {
  const files = fs.readdirSync(BRIDGE_DIR).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));

  if (files.length > 0) {
    console.error('❌ Error: Bridge files detected in src/types:');
    files.forEach((file) => console.error(`   - ${file}`));
    console.error('\nBridge files should be moved to their proper module locations.');
    process.exit(1);
  } else {
    console.log('✅ No bridge files found in src/types');
  }
} else {
  console.log('✅ No types directory found (good!)');
}

// Check 2: Look for imports from bridge files
console.log('\n📝 Checking for imports from bridge files...');
try {
  const results = execSync(
    `grep -r "from ['\\\"].*\/types\/" --include="*.ts" --include="*.tsx" ${SRC_DIR} | grep -v "test-eslint-rules.tsx" | grep -v ".bak"`,
    { encoding: 'utf-8' },
  );
  console.error('❌ Error: Found imports from bridge files:');
  console.error(results);
  process.exit(1);
} catch (error) {
  if (error.status === 1) {
    console.log('✅ No imports from bridge files found');
  } else {
    console.error('❌ Error while checking imports:', error.message);
    process.exit(1);
  }
}

// Check 3: Verify module boundary compliance
console.log('\n🧩 Verifying module boundaries...');

// Define module boundaries (which modules can import from which)
const moduleBoundaries = {
  core: [], // Core can't import from other modules (base module)
  tenant: ['core'],
  conversation: ['core', 'tenant'],
  product: ['core', 'tenant'],
  order: ['core', 'tenant', 'product'],
  storefront: ['core', 'tenant', 'product', 'order'],
  theme: ['core', 'tenant'],
  monitoring: ['core'],
};

// Get all modules
let allModules = [];
try {
  if (fs.existsSync(MODULES_DIR)) {
    allModules = fs
      .readdirSync(MODULES_DIR)
      .filter((dir) => fs.statSync(path.join(MODULES_DIR, dir)).isDirectory());
  }
} catch (err) {
  console.error('❌ Error reading modules directory:', err.message);
}

// Check module dependencies
let boundaryViolations = [];

for (const module of allModules) {
  const moduleDir = path.join(MODULES_DIR, module);
  const allowedDependencies = moduleBoundaries[module] || [];

  // Find all TypeScript files in this module
  const files = glob.sync(path.join(moduleDir, '**/*.{ts,tsx}'));

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const importLines = content.match(/import\s+.*\s+from\s+['"]@\/modules\/([^\/'"]+)/g) || [];

    for (const importLine of importLines) {
      const match = importLine.match(/from\s+['"]@\/modules\/([^\/'"]+)/);
      if (match) {
        const importedModule = match[1];

        // Skip if importing from the same module
        if (importedModule === module) continue;

        // Check if import is allowed
        if (!allowedDependencies.includes(importedModule)) {
          boundaryViolations.push({
            file: path.relative(ROOT_DIR, file),
            module,
            importedModule,
            importLine: importLine.trim(),
          });
        }
      }
    }
  }
}

if (boundaryViolations.length > 0) {
  console.error('❌ Module boundary violations detected:');
  boundaryViolations.forEach((violation) => {
    console.error(
      `   - ${violation.module} imports from ${violation.importedModule} in ${violation.file}`,
    );
    console.error(`     ${violation.importLine}`);
  });
  process.exit(1);
} else {
  console.log('✅ Module boundaries respected');
}

console.log('\n✅ All architecture checks passed!');
