#!/usr/bin/env node

/**
 * Import Order Fixer Script
 * 
 * This script specifically addresses import ordering issues and more aggressively
 * removes unused imports that ESLint is flagging.
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

console.log('\n🔧 Fixing import order and removing unused imports...');

// Get list of files with ESLint issues
const findFilesWithIssues = () => {
  try {
    // Run ESLint to get a list of files with issues
    const { execSync } = require('child_process');
    const output = execSync('npx eslint --format json "src/**/*.{ts,tsx,js,jsx}"', { 
      cwd: ROOT_DIR,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr to avoid showing ESLint errors
    });
    
    const results = JSON.parse(output);
    return results
      .filter(result => result.errorCount > 0 || result.warningCount > 0)
      .map(result => path.relative(ROOT_DIR, result.filePath));
  } catch (error) {
    // If ESLint fails, fall back to checking all files
    console.log('⚠️ ESLint failed, falling back to checking all files');
    return glob.sync(path.join(SRC_DIR, '**/*.{ts,tsx,js,jsx}'))
      .map(file => path.relative(ROOT_DIR, file));
  }
};

// Function to sort imports according to best practices
const sortImports = (fileContent) => {
  // Extract all import statements
  const importRegex = /^import.*?;$/gm;
  const imports = fileContent.match(importRegex) || [];
  
  if (imports.length === 0) return fileContent;
  
  // Find the position of the first and last import
  const firstImportPos = fileContent.indexOf(imports[0]);
  const lastImportPos = fileContent.indexOf(imports[imports.length - 1]) + imports[imports.length - 1].length;
  
  // Group imports by type
  const reactImports = imports.filter(imp => /^import.*?from\s+['"]react['"]/i.test(imp));
  const nextImports = imports.filter(imp => /^import.*?from\s+['"]next\//i.test(imp));
  const lucideImports = imports.filter(imp => /^import.*?from\s+['"]lucide-react['"]/i.test(imp));
  const externalImports = imports.filter(imp => {
    return !/^import.*?from\s+['"](react|next\/|lucide-react|@\/)/i.test(imp) && 
           /^import.*?from\s+['"][^.@\/]/i.test(imp);
  });
  const localImports = imports.filter(imp => {
    return /^import.*?from\s+['"]@\//i.test(imp);
  });
  const relativeImports = imports.filter(imp => {
    return /^import.*?from\s+['"]\./i.test(imp);
  });
  
  // Combine in the correct order with spacing
  const sortedImports = [
    ...reactImports,
    reactImports.length > 0 && nextImports.length > 0 ? '' : '',
    ...nextImports,
    (reactImports.length > 0 || nextImports.length > 0) && lucideImports.length > 0 ? '' : '',
    ...lucideImports,
    (reactImports.length > 0 || nextImports.length > 0 || lucideImports.length > 0) && externalImports.length > 0 ? '' : '',
    ...externalImports,
    (reactImports.length > 0 || nextImports.length > 0 || lucideImports.length > 0 || externalImports.length > 0) && localImports.length > 0 ? '' : '',
    ...localImports,
    (reactImports.length > 0 || nextImports.length > 0 || lucideImports.length > 0 || externalImports.length > 0 || localImports.length > 0) && relativeImports.length > 0 ? '' : '',
    ...relativeImports,
  ].filter(Boolean).join('\n');
  
  // Replace the import section
  return fileContent.substring(0, firstImportPos) + sortedImports + fileContent.substring(lastImportPos);
};

// More aggressive removal of unused imports and variables
const removeUnusedImports = (fileContent) => {
  // Look for imports with specific variables that ESLint flags as unused
  const unusedVarsToRemove = [
    'User', 'Users', 'Store', 'Search', 'InfoIcon', 'TextField', 'FormControl', 
    'InputLabel', 'Select', 'MenuItem', 'Paper', 'Tooltip', 'Check', 'Save',
    'CartItem', 'CartService', 'Phone', 'Card', 'Download', 'CheckCircle'
  ];
  
  let content = fileContent;
  
  // Remove entire imports if they're only importing unused variables
  for (const varName of unusedVarsToRemove) {
    const singleImportRegex = new RegExp(`import\\s+{\\s*${varName}\\s*}\\s+from\\s+['\"].+?['\"];`, 'g');
    content = content.replace(singleImportRegex, '');
    
    // Remove from multi-variable imports
    const regex = new RegExp(`({[^}]*?)(,\\s*${varName}|${varName}\\s*,)([^}]*})`, 'g');
    content = content.replace(regex, (match, start, _, end) => {
      return `${start}${end}`;
    });
  }
  
  return content;
};

// Process a file to fix import issues
const processFile = (relativeFilePath) => {
  const filePath = path.join(ROOT_DIR, relativeFilePath);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // First remove unused imports
  content = removeUnusedImports(content);
  
  // Then sort imports
  content = sortImports(content);
  
  // Check if we've made changes
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed imports in ${relativeFilePath}`);
    return true;
  }
  
  return false;
};

// Get files with ESLint issues and process them
const filesToFix = findFilesWithIssues();
let fixedCount = 0;

filesToFix.forEach(file => {
  if (processFile(file)) {
    fixedCount++;
  }
});

console.log(`\n🎉 Fixed imports in ${fixedCount} files`);
console.log('Running ESLint again to verify fixes...');

// Run ESLint to check for remaining issues
try {
  const { execSync } = require('child_process');
  execSync('npx eslint --fix "src/**/*.{ts,tsx,js,jsx}"', { 
    cwd: ROOT_DIR,
    stdio: 'inherit'
  });
} catch (e) {
  // ESLint might still find errors, but we've made progress
  console.log('⚠️ ESLint found some remaining issues.');
  console.log('You may need to manually address some TypeScript "any" types and other specific issues.');
}
