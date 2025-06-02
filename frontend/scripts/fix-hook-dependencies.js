#!/usr/bin/env node

/**
 * fix-hook-dependencies.js
 * 
 * A script to fix React Hook dependency issues in the codebase.
 * Identifies useEffect, useCallback, and useMemo hooks with missing dependencies
 * and adds the missing dependencies to the dependency array.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SOURCE_DIR = path.resolve(__dirname, '../src');
const FIXED_COUNT = {
  useEffect: 0,
  useCallback: 0,
  useMemo: 0
};

// Common patterns for hooks with missing dependencies
const HOOK_PATTERNS = [
  // useEffect with common missing dependencies
  {
    pattern: /useEffect\(\(\)\s+=>\s+{\s+loadPermissions\(\);\s+},\s+\[\]\);/g,
    replacement: 'useEffect(() => {\n    loadPermissions();\n  }, [loadPermissions]);'
  },
  {
    pattern: /useEffect\(\(\)\s+=>\s+{\s+loadVersions\(\);\s+},\s+\[\]\);/g,
    replacement: 'useEffect(() => {\n    loadVersions();\n  }, [loadVersions]);'
  },
  {
    pattern: /useEffect\(\(\)\s+=>\s+{\s+fetchRules\(\);\s+},\s+\[\]\);/g,
    replacement: 'useEffect(() => {\n    fetchRules();\n  }, [fetchRules]);'
  },
  {
    pattern: /useEffect\(\(\)\s+=>\s+{\s+fetchData\(\);\s+},\s+\[\]\);/g,
    replacement: 'useEffect(() => {\n    fetchData();\n  }, [fetchData]);'
  },
  {
    pattern: /useEffect\(\(\)\s+=>\s+{\s+fetchProducts\(\);\s+},\s+\[\]\);/g,
    replacement: 'useEffect(() => {\n    fetchProducts();\n  }, [fetchProducts]);'
  },
  {
    pattern: /useEffect\(\(\)\s+=>\s+{\s+loadData\(\);\s+},\s+\[\]\);/g,
    replacement: 'useEffect(() => {\n    loadData();\n  }, [loadData]);'
  },
  // Auth-related useEffect hooks
  {
    pattern: /useEffect\(\(\)\s+=>\s+{\s+if\s+\(!\s*isAuthenticated\)\s+{\s+redirectToLogin\(\);\s+}\s+},\s+\[\]\);/g,
    replacement: 'useEffect(() => {\n    if (!isAuthenticated) {\n      redirectToLogin();\n    }\n  }, [isAuthenticated, redirectToLogin]);'
  },
  {
    pattern: /useEffect\(\(\)\s+=>\s+{\s+if\s+\(!\s*isAuthenticated\)\s+redirectToLogin\(\);\s+},\s+\[\]\);/g,
    replacement: 'useEffect(() => {\n    if (!isAuthenticated) redirectToLogin();\n  }, [isAuthenticated, redirectToLogin]);'
  },
  // useCallback with missing dependencies
  {
    pattern: /const\s+(\w+)\s+=\s+useCallback\(\(\)\s+=>\s+{\s+([^}]*?)(\w+)(\([^)]*\))[^}]*?},\s+\[\]\);/g,
    replacement: (match, funcName, prefix, calledFunc, args) => {
      return `const ${funcName} = useCallback(() => {\n    ${prefix}${calledFunc}${args}\n  }, [${calledFunc}]);`;
    }
  },
  // useMemo with missing dependencies
  {
    pattern: /const\s+(\w+)\s+=\s+useMemo\(\(\)\s+=>\s+{\s+return\s+([^;]*?)(\w+)([^;]*?);[^}]*?},\s+\[\]\);/g,
    replacement: (match, varName, prefix, usedVar, suffix) => {
      return `const ${varName} = useMemo(() => {\n    return ${prefix}${usedVar}${suffix};\n  }, [${usedVar}]);`;
    }
  }
];

/**
 * Advanced dependency analyzer to find and fix complex hook dependencies
 */
function analyzeAndFixDependencies(content) {
  // Find all useEffect, useCallback, and useMemo hooks with empty dependency arrays
  const hooks = [...content.matchAll(/use(Effect|Callback|Memo)\(\([^)]*\)\s+=>\s+{([^}]*)},\s+\[\]\);/g)];
  
  let newContent = content;
  
  hooks.forEach(hookMatch => {
    const [fullMatch, hookType, hookBody] = hookMatch;
    const hookBodyTrimmed = hookBody.trim();
    
    // Skip if already modified
    if (newContent.indexOf(fullMatch) === -1) return;
    
    // Extract potential dependencies from the hook body
    const fnCallRegex = /(\w+)\(/g;
    const stateVarRegex = /\b(set\w+)\(/g;
    const propsRegex = /props\.(\w+)/g;
    
    const dependencies = new Set();
    
    // Find function calls
    let fnMatch;
    while ((fnMatch = fnCallRegex.exec(hookBodyTrimmed)) !== null) {
      const fnName = fnMatch[1];
      // Skip common built-ins, React functions and setState calls
      if (
        !['if', 'console', 'JSON', 'parseInt', 'parseFloat', 'String', 'Number', 'Boolean', 'set'].includes(fnName) && 
        !fnName.startsWith('set') &&
        fnName !== 'useState' &&
        fnName !== 'useEffect' &&
        fnName !== 'useCallback' &&
        fnName !== 'useMemo' &&
        fnName !== 'useRef'
      ) {
        dependencies.add(fnName);
      }
    }
    
    // Find props access
    let propsMatch;
    while ((propsMatch = propsRegex.exec(hookBodyTrimmed)) !== null) {
      dependencies.add(`props.${propsMatch[1]}`);
    }
    
    // Create replacement with proper dependencies
    if (dependencies.size > 0) {
      const depsArray = [...dependencies].join(', ');
      const replacement = fullMatch.replace(
        /\[\]\);$/, 
        `[${depsArray}]);`
      );
      
      // Apply the replacement
      newContent = newContent.replace(fullMatch, replacement);
      FIXED_COUNT[hookType] += 1;
    }
  });
  
  return newContent;
}

/**
 * Fixes hook dependencies in a single file
 */
function fixHookDependenciesInFile(filePath) {
  let fileContent = fs.readFileSync(filePath, 'utf8');
  let wasModified = false;
  
  // Apply fixed patterns first
  HOOK_PATTERNS.forEach(({ pattern, replacement }) => {
    const originalContent = fileContent;
    
    if (typeof replacement === 'function') {
      fileContent = fileContent.replace(pattern, replacement);
    } else {
      fileContent = fileContent.replace(pattern, replacement);
    }
    
    if (originalContent !== fileContent) {
      wasModified = true;
      // Track which hook type was fixed
      if (pattern.toString().includes('useEffect')) {
        FIXED_COUNT.useEffect++;
      } else if (pattern.toString().includes('useCallback')) {
        FIXED_COUNT.useCallback++;
      } else if (pattern.toString().includes('useMemo')) {
        FIXED_COUNT.useMemo++;
      }
    }
  });
  
  // Apply advanced dependency analysis for more complex cases
  const contentAfterAnalysis = analyzeAndFixDependencies(fileContent);
  if (contentAfterAnalysis !== fileContent) {
    fileContent = contentAfterAnalysis;
    wasModified = true;
  }
  
  if (wasModified) {
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`✅ Fixed hook dependencies in ${filePath.replace(process.cwd(), '')}`);
  }
}

/**
 * Process all React files in the project
 */
function processAllFiles() {
  // Find React files (TSX and JSX)
  const files = glob.sync(path.join(SOURCE_DIR, '**/*.{tsx,jsx}'));
  
  console.log(`🔍 Found ${files.length} React files to process`);
  
  // Process each file
  files.forEach(file => {
    try {
      fixHookDependenciesInFile(file);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  });
  
  console.log('\n===== SUMMARY =====');
  console.log(`✅ Fixed ${FIXED_COUNT.useEffect} useEffect hooks`);
  console.log(`✅ Fixed ${FIXED_COUNT.useCallback} useCallback hooks`);
  console.log(`✅ Fixed ${FIXED_COUNT.useMemo} useMemo hooks`);
  console.log('===================\n');
}

// Main execution
console.log('🛠️ Starting fix of React hook dependencies...');
processAllFiles();
console.log('✅ Completed fixing React hook dependencies!');
