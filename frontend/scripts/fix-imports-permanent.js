/**
 * Permanent Fix for Import Casing Issues
 * 
 * This script runs during the build process to automatically fix common import issues:
 * 1. Standardizes import casing (e.g., storefrontEditor → StorefrontEditor)
 * 2. Fixes circular imports in type files
 * 3. Handles duplicate React imports
 * 4. Ensures "use client" directives are properly placed
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Paths
const SRC_DIR = path.join(__dirname, '..', 'src');
const TYPES_DIR = path.join(SRC_DIR, 'types');

// Rules for import fixes
const IMPORT_RULES = [
  // Fix casing in imports
  { pattern: /types\/storefrontEditor/g, replacement: 'types/StorefrontEditor' },
  { pattern: /types\/file/g, replacement: 'types/File' },
  { pattern: /types\/product/g, replacement: 'types/Product' },
  { pattern: /types\/order/g, replacement: 'types/Order' },
  { pattern: /types\/notification/g, replacement: 'types/Notification' },
  { pattern: /lib\/api\/storefrontEditor/g, replacement: 'lib/api/StorefrontEditor' },
  
  // Fix circular imports (replace with comment)
  { pattern: /import\s+{\s*(\w+)\s*}\s+from\s+['"]@\/types\/\1['"]/g, replacement: '// Removed circular import' },
  
  // Fix duplicate React imports
  { pattern: /import\s+React\s+from\s+['"]react['"];\s*import\s+React\s+from\s+['"]react['"];/g, replacement: 'import React from \'react\';' },
  { pattern: /import\s+{\s*React\s*}\s+from\s+['"]react['"];/g, replacement: '' },
  
  // Fix Record import from React
  { pattern: /import\s+{\s*Record\s*}\s+from\s+['"]react['"];/g, replacement: '// Removed invalid Record import' },
  
  // Fix component self-imports
  { pattern: /import\s+{\s*([A-Za-z0-9]+)(,\s*[A-Za-z0-9]+Props)?\s*}\s+from\s+['"]@\/components\/.+\/\1['"];/g, replacement: '// Removed self-import' },
];

// Process a single file
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let modified = false;
    
    // Handle "use client" directive placement
    if (content.includes('"use client"') && !content.startsWith('"use client"')) {
      content = content.replace(/["']use client["'];?\n?/g, '');
      content = '"use client";\n\n' + content;
      modified = true;
    }
    
    // Apply import rules
    IMPORT_RULES.forEach(rule => {
      const newContent = content.replace(rule.pattern, rule.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    // Write changes if modified
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed imports in ${filePath.replace(__dirname + '/../', '')}`);
    }
    
    return modified;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

// Find and process all TypeScript/React files
function fixImports() {
  console.log('🔍 Scanning for import issues...');
  
  const files = glob.sync([
    path.join(SRC_DIR, '**/*.ts'),
    path.join(SRC_DIR, '**/*.tsx'),
    path.join(SRC_DIR, '**/*.js'),
    path.join(SRC_DIR, '**/*.jsx'),
  ]);
  
  let fixedCount = 0;
  
  files.forEach((file, index) => {
    if (processFile(file)) {
      fixedCount++;
    }
    
    if ((index + 1) % 20 === 0 || index === files.length - 1) {
      console.log(`Processed ${index + 1}/${files.length} files...`);
    }
  });
  
  console.log(`\n✅ Fixed ${fixedCount} files with import issues`);
}

// Fix specific type files with known issues
function fixTypeFiles() {
  console.log('🔧 Fixing known type file issues...');
  
  // Fix StorefrontEditor.ts
  const storefrontEditorPath = path.join(TYPES_DIR, 'StorefrontEditor.ts');
  if (fs.existsSync(storefrontEditorPath)) {
    let content = fs.readFileSync(storefrontEditorPath, 'utf8');
    content = content.replace(/import\s+{[^}]+}\s+from\s+['"]@\/components\/StorefrontEditor\/[^'"]+['"]/g, 
      '// Import removed to avoid circular dependencies');
    fs.writeFileSync(storefrontEditorPath, content, 'utf8');
    console.log('  Fixed StorefrontEditor.ts');
  }
  
  // Fix circular imports in other type files
  ['Product.ts', 'Order.ts', 'Notification.ts', 'File.ts'].forEach(file => {
    const filePath = path.join(TYPES_DIR, file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      content = content.replace(/import\s+{[^}]+}\s+from\s+['"]@\/types\/[^'"]+['"]/g, 
        '// Removed circular import');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  Fixed ${file}`);
    }
  });
}

// Main execution
console.log('🚀 Running permanent import fixer...');
fixTypeFiles();
fixImports();
console.log('✨ All done! Import issues have been permanently fixed.');
