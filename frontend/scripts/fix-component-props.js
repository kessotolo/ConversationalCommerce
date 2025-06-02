#!/usr/bin/env node

/**
 * Fix Component Props Script
 *
 * This script looks for and fixes common component prop issues:
 * 1. Changes Button props like 'variant' and 'size' to match component definitions
 * 2. Changes Badge props to match component definitions
 * 3. Adds missing imports for icons like Check, User, Phone
 * 4. Adds property type safety checks
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const ROOT_DIR = path.resolve(__dirname, '..');
const DASH_DIR = path.join(ROOT_DIR, 'src/app/dashboard');

console.log('\n🔧 Fixing component prop issues...');

// Process files to fix Button and Badge variants
const fixComponentProps = (filePath) => {
  if (!fs.existsSync(filePath)) return false;

  const content = fs.readFileSync(filePath, 'utf-8');
  let updatedContent = content;
  let changes = false;

  // Fix Button variants and sizes
  // Replace variant="..." with className="..." for Button components
  updatedContent = updatedContent.replace(
    /<Button([^>]*?)variant=["']([^"']+)["']([^>]*?)>/g,
    (match, before, variant, after) => {
      changes = true;
      // If there's already a className, append to it
      if (before.includes('className=') || after.includes('className=')) {
        return match.replace(/variant=["']([^"']+)["']/, '');
      } else {
        return `<Button${before}className="btn-${variant}"${after}>`;
      }
    },
  );

  // Replace size="..." with className="..." for Button components
  updatedContent = updatedContent.replace(
    /<Button([^>]*?)size=["']([^"']+)["']([^>]*?)>/g,
    (match, before, size, after) => {
      changes = true;
      // If there's already a className, append to it
      if (before.includes('className=') || after.includes('className=')) {
        return match.replace(/size=["']([^"']+)["']/, '');
      } else {
        return `<Button${before}className="btn-${size}"${after}>`;
      }
    },
  );

  // Fix Badge variants
  // Replace variant="..." with className="..." for Badge components
  updatedContent = updatedContent.replace(
    /<Badge([^>]*?)variant=["']([^"']+)["']([^>]*?)>/g,
    (match, before, variant, after) => {
      changes = true;
      // If there's already a className, append to it
      if (before.includes('className=') || after.includes('className=')) {
        return match.replace(/variant=["']([^"']+)["']/, '');
      } else {
        return `<Badge${before}className="badge-${variant}"${after}>`;
      }
    },
  );

  // Add null checks for product or order objects
  if (filePath.includes('products') && updatedContent.includes('product.')) {
    updatedContent = updatedContent.replace(/product\.([\w]+)/g, 'product?.$1');
    changes = true;
  }

  if (filePath.includes('orders') && updatedContent.includes('order.')) {
    updatedContent = updatedContent.replace(/order\.([\w]+)/g, 'order?.$1');
    changes = true;
  }

  // Add missing icon imports
  const existingIconImport = updatedContent.match(
    /import\s*{([^}]*)}\s*from\s*['"]lucide-react['"]/,
  );
  if (existingIconImport) {
    const iconsList = existingIconImport[1].split(',').map((i) => i.trim());
    const missingIcons = [];

    // Check for icons used but not imported
    if (updatedContent.includes('<Check') && !iconsList.includes('Check'))
      missingIcons.push('Check');
    if (updatedContent.includes('<User') && !iconsList.includes('User')) missingIcons.push('User');
    if (updatedContent.includes('<Phone') && !iconsList.includes('Phone'))
      missingIcons.push('Phone');

    if (missingIcons.length > 0) {
      const allIcons = [...iconsList, ...missingIcons].join(', ');
      updatedContent = updatedContent.replace(
        /import\s*{([^}]*)}\s*from\s*['"]lucide-react['"]/,
        `import { ${allIcons} } from 'lucide-react'`,
      );
      changes = true;
    }
  }

  // Fix and clean up imports
  const importLines = updatedContent.match(/import\s+.*\s+from\s+['"'][^'"]+['"'];?/g) || [];
  const seenImports = new Set();
  let deduplicatedImports = [];

  for (const importLine of importLines) {
    if (!seenImports.has(importLine)) {
      seenImports.add(importLine);
      deduplicatedImports.push(importLine);
    } else {
      changes = true;
    }
  }

  if (importLines.length !== deduplicatedImports.length) {
    // Replace all imports with deduplicated list
    const importSection = importLines.join('\n');
    const newImportSection = deduplicatedImports.join('\n');
    updatedContent = updatedContent.replace(importSection, newImportSection);
  }

  // Only write changes if we actually made changes
  if (changes && updatedContent !== content) {
    fs.writeFileSync(filePath, updatedContent);
    console.log(`✅ Fixed component props in ${path.relative(ROOT_DIR, filePath)}`);
    return true;
  }

  return false;
};

// Find dashboard files
const dashboardFiles = glob.sync(`${DASH_DIR}/**/*.{ts,tsx}`);

// Process each file
let fixedCount = 0;
dashboardFiles.forEach((file) => {
  if (fixComponentProps(file)) {
    fixedCount++;
  }
});

console.log(`\n🎉 Fixed component props in ${fixedCount} files`);
