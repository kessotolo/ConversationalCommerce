#!/usr/bin/env node

/**
 * This script finds import restriction violations in the codebase.
 * It helps identify files that import directly from module internals
 * instead of using the public API (index.ts).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.resolve(__dirname, '../src');
const MODULES_DIR = path.resolve(SRC_DIR, 'modules');
const IGNORED_DIRS = ['node_modules', 'tests', 'legacy', '.next'];

// Find all module directories
const moduleDirectories = fs.readdirSync(MODULES_DIR)
  .filter(dir => fs.statSync(path.join(MODULES_DIR, dir)).isDirectory());

console.log('Checking for import violations in the following modules:');
moduleDirectories.forEach(dir => console.log(`- ${dir}`));
console.log('');

// Find all TypeScript files
const findTsFiles = () => {
  try {
    const output = execSync(
      `find ${SRC_DIR} -type f -name "*.ts" -o -name "*.tsx" | grep -v "${IGNORED_DIRS.join('\\|')}"`,
      { encoding: 'utf8' }
    );
    return output.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error finding TypeScript files:', error);
    return [];
  }
};

// Check if a file has import violations
const checkFileForViolations = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];

  moduleDirectories.forEach(moduleDir => {
    // Skip if importing from own module
    if (filePath.includes(`/modules/${moduleDir}/`)) {
      return;
    }

    // Check for direct imports from module internals
    const directImportRegex = new RegExp(`from ['"]@?/?(?:src/)?modules/${moduleDir}/(?!index)([^'"]+)['"]`, 'g');
    let match;
    while ((match = directImportRegex.exec(content)) !== null) {
      violations.push({
        module: moduleDir,
        importPath: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
  });

  return { filePath, violations };
};

// Main execution
const main = () => {
  const tsFiles = findTsFiles();
  console.log(`Found ${tsFiles.length} TypeScript files to check`);
  
  let totalViolations = 0;
  const moduleViolationCount = {};
  
  tsFiles.forEach(filePath => {
    const { violations } = checkFileForViolations(filePath);
    
    if (violations.length > 0) {
      console.log(`\nFile: ${filePath}`);
      
      violations.forEach(v => {
        console.log(`  Line ${v.line}: Imports directly from ${v.module}/${v.importPath}`);
        totalViolations++;
        
        moduleViolationCount[v.module] = (moduleViolationCount[v.module] || 0) + 1;
      });
    }
  });
  
  console.log('\n--------------------------------');
  console.log(`Total violations found: ${totalViolations}`);
  
  if (totalViolations > 0) {
    console.log('\nViolations by module:');
    Object.entries(moduleViolationCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([module, count]) => {
        console.log(`  ${module}: ${count} violations`);
      });
      
    console.log('\nFix recommendation:');
    console.log('1. Update the module\'s index.ts to export all necessary types and functions');
    console.log('2. Change imports to use the module\'s public API:');
    console.log('   import { Type } from \'@/modules/moduleName\';');
  } else {
    console.log('Great job! No import restriction violations found.');
  }
};

main();
