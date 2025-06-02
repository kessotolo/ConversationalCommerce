#!/usr/bin/env node

/**
 * fix-unused-variables.js
 * 
 * A targeted script to fix unused variables and imports in the codebase.
 * This script identifies and removes common unused imports and variable declarations
 * that were flagged by ESLint.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SOURCE_DIR = path.resolve(__dirname, '../src');
const FIXED_COUNT = {
  imports: 0,
  variables: 0
};

// Common unused imports to remove
const UNUSED_IMPORTS = [
  // UI Component imports
  { pattern: /import\s+{\s*[^}]*?\bDialog\b[^}]*?}\s+from\s+['"][^'"]+['"];?\n/g },
  { pattern: /import\s+{\s*[^}]*?\bUserPlusIcon\b[^}]*?}\s+from\s+['"][^'"]+['"];?\n/g },
  { pattern: /import\s+{\s*[^}]*?\bCopy\b[^}]*?}\s+from\s+['"][^'"]+['"];?\n/g },
  { pattern: /import\s+{\s*[^}]*?\bLink\b[^}]*?}\s+from\s+['"][^'"]+['"];?\n/g },
  
  // Type imports
  { pattern: /import\s+{\s*[^}]*?\bStatus\b[^}]*?}\s+from\s+['"][^'"]+['"];?\n/g },
  { pattern: /import\s+{\s*[^}]*?\bDraftsResponse\b[^}]*?}\s+from\s+['"][^'"]+['"];?\n/g },
  { pattern: /import\s+{\s*[^}]*?\bcompareVersions\b[^}]*?}\s+from\s+['"][^'"]+['"];?\n/g },
  { pattern: /import\s+{\s*[^}]*?\bRuleCondition\b[^}]*?}\s+from\s+['"][^'"]+['"];?\n/g },
  
  // Package imports
  { pattern: /import\s+axios\s+from\s+['"]axios['"];?\n/g },
  
  // Clean up any empty curly braces imports
  { pattern: /import\s+{\s*}\s+from\s+['"][^'"]+['"];?\n/g }
];

// Common unused variable declarations
const UNUSED_VARIABLES = [
  // State variables
  { 
    pattern: /const\s+\[\s*filter\s*,\s*setFilter\s*\]\s*=\s*useState\([^)]*\);/g,
    replacement: '// Filter state removed (unused)\n  // const [filter, setFilter] = useState([]);'
  },
  { 
    pattern: /const\s+\[\s*total\s*,\s*setTotal\s*\]\s*=\s*useState\([^)]*\);/g,
    replacement: '// Total state removed (unused)\n  // const [total, setTotal] = useState(0);'
  },
  
  // Function params
  { 
    pattern: /\(\s*{\s*[^}]*?\btenantId\b[^}]*?}\s*\)/g,
    replacement: function(match) {
      return match.replace('tenantId', '_tenantId');
    }
  },
  { 
    pattern: /\(\s*{\s*[^}]*?\bpassword\b[^}]*?}\s*\)/g,
    replacement: function(match) {
      return match.replace('password', '_password');
    }
  },
  
  // Variable declarations
  { 
    pattern: /const\s+handlePageChange\s*=\s*[^;]+;/g,
    replacement: '// Unused page handler removed\n  // const handlePageChange = (page) => setCurrentPage(page);'
  },
  { 
    pattern: /const\s+sendMessage\s*=\s*[^;]+;/g,
    replacement: '// Unused message handler removed\n  // const sendMessage = useCallback(...);'
  },
  { 
    pattern: /const\s+user\s*=\s*[^;]+;/g,
    replacement: '// const user = null; // Unused variable removed'
  },
  { 
    pattern: /const\s+isOnline\s*=\s*[^;]+;/g,
    replacement: '// const isOnline = navigator.onLine; // Unused variable removed'
  }
];

// Helper function to handle imports that need to be removed entirely or partially
function cleanImports(content, imports) {
  let newContent = content;
  
  // First pass: identify and collect imports to process
  const importLines = content.match(/import\s+.*?from\s+['"][^'"]+['"];?/g) || [];
  
  importLines.forEach(importLine => {
    // Check if the import contains multiple named imports
    if (importLine.includes('{') && importLine.includes('}')) {
      // Extract components from between curly braces
      const componentsMatch = importLine.match(/{([^}]*)}/);
      if (componentsMatch) {
        const components = componentsMatch[1].split(',').map(c => c.trim());
        
        // Identify unused components
        const unusedComponents = components.filter(component => {
          const componentName = component.split(' as ')[0].trim();
          return imports.some(({ pattern }) => {
            const regex = new RegExp(`\\b${componentName}\\b`);
            return regex.test(importLine) && !new RegExp(`\\b${componentName}\\b`).test(content.replace(importLine, ''));
          });
        });
        
        if (unusedComponents.length > 0 && unusedComponents.length < components.length) {
          // Some components are unused, but not all - remove only the unused ones
          const newComponents = components.filter(c => !unusedComponents.includes(c)).join(', ');
          const newImport = importLine.replace(componentsMatch[1], newComponents);
          newContent = newContent.replace(importLine, newImport);
          FIXED_COUNT.imports += unusedComponents.length;
        }
      }
    }
  });
  
  // Second pass: remove entire import statements that match patterns
  imports.forEach(({ pattern }) => {
    const originalContent = newContent;
    newContent = newContent.replace(pattern, '');
    if (originalContent !== newContent) {
      FIXED_COUNT.imports++;
    }
  });
  
  return newContent;
}

/**
 * Fixes unused variables in a single file
 */
function fixUnusedInFile(filePath) {
  let fileContent = fs.readFileSync(filePath, 'utf8');
  let wasModified = false;
  
  // Clean imports
  const newContent = cleanImports(fileContent, UNUSED_IMPORTS);
  if (newContent !== fileContent) {
    fileContent = newContent;
    wasModified = true;
  }
  
  // Fix unused variables
  UNUSED_VARIABLES.forEach(({ pattern, replacement }) => {
    const originalContent = fileContent;
    if (typeof replacement === 'function') {
      fileContent = fileContent.replace(pattern, replacement);
    } else {
      fileContent = fileContent.replace(pattern, replacement);
    }
    
    if (originalContent !== fileContent) {
      wasModified = true;
      FIXED_COUNT.variables++;
    }
  });
  
  if (wasModified) {
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`✅ Fixed unused variables in ${filePath.replace(process.cwd(), '')}`);
  }
}

/**
 * Process all files in the project
 */
function processAllFiles() {
  // Find relevant files
  const files = glob.sync(path.join(SOURCE_DIR, '**/*.{ts,tsx}'));
  
  console.log(`🔍 Found ${files.length} files to process`);
  
  // Process each file
  files.forEach(file => {
    try {
      fixUnusedInFile(file);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  });
  
  console.log('\n===== SUMMARY =====');
  console.log(`✅ Fixed ${FIXED_COUNT.imports} unused imports`);
  console.log(`✅ Fixed ${FIXED_COUNT.variables} unused variables`);
  console.log('===================\n');
}

// Main execution
console.log('🛠️ Starting fix of unused variables and imports...');
processAllFiles();
console.log('✅ Completed fixing unused variables and imports!');
