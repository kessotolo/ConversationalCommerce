#!/usr/bin/env node

/**
 * Build Verification Script
 * This script scans the codebase for common issues that cause build failures
 * and helps prevent deployment problems.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for better output formatting
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

console.log(`${colors.cyan}Build Verification Script${colors.reset}`);
console.log(`${colors.cyan}==========================${colors.reset}`);

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const pagesDir = path.join(rootDir, 'pages');
let errors = 0;
let warnings = 0;
let fixes = 0;

/**
 * Utility function to recursively get all files in a directory
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      fileList = getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Check for missing component imports
 */
function checkMissingImports() {
  console.log(`\n${colors.magenta}Checking for missing component imports...${colors.reset}`);
  
  // Get all React component files
  const tsxFiles = getAllFiles(srcDir).filter(file => file.endsWith('.tsx') || file.endsWith('.jsx'));
  const componentNames = new Set();
  const importedComponents = new Map();
  
  // Extract component names and imports
  tsxFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Extract exported component names
    const exportMatches = content.match(/export\s+(default\s+)?(?:function|const|class)\s+([A-Z][A-Za-z0-9_]*)/g);
    if (exportMatches) {
      exportMatches.forEach(match => {
        const nameMatch = match.match(/([A-Z][A-Za-z0-9_]*)$/);
        if (nameMatch && nameMatch[1]) {
          componentNames.add(nameMatch[1]);
        }
      });
    }
    
    // Extract imported components
    const importMatches = content.match(/import\s+.*?from\s+['"][^'"]+['"]/g);
    if (importMatches) {
      importMatches.forEach(match => {
        if (!importedComponents.has(file)) {
          importedComponents.set(file, new Set());
        }
        const components = importedComponents.get(file);
        
        // Extract component names from import statements
        const namedImports = match.match(/import\s+{([^}]+)}/);
        if (namedImports && namedImports[1]) {
          namedImports[1].split(',').forEach(imp => {
            const trimmedName = imp.trim().split(' as ')[0];
            components.add(trimmedName);
          });
        }
      });
    }
    
    // Check for JSX usage of components that might not be imported
    const jsxMatches = content.match(/<([A-Z][A-Za-z0-9_]*)/g);
    if (jsxMatches) {
      jsxMatches.forEach(match => {
        const componentName = match.substring(1);
        if (!componentNames.has(componentName) && (!importedComponents.has(file) || !importedComponents.get(file).has(componentName))) {
          console.log(`${colors.yellow}Warning: Component ${colors.white}${componentName}${colors.yellow} used in ${colors.white}${path.relative(rootDir, file)}${colors.yellow} might be missing an import${colors.reset}`);
          warnings++;
        }
      });
    }
  });
  
  console.log(`${componentNames.size} components found, checked for missing imports`);
}

/**
 * Check for UUID handling in database models
 */
function checkUuidConsistency() {
  console.log(`\n${colors.magenta}Checking for UUID consistency in database models...${colors.reset}`);
  
  const modelFiles = getAllFiles(srcDir).filter(file => 
    (file.endsWith('.ts') || file.endsWith('.tsx')) && 
    !file.endsWith('.test.ts') && 
    !file.endsWith('.test.tsx')
  );
  
  let uuidPatterns = 0;
  
  modelFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for UUID-related patterns
    if (content.includes('UUID') || content.includes('uuid')) {
      uuidPatterns++;
      
      // Check for proper UUID type handling
      if (content.includes('as_uuid=True') && !content.includes('UUID(as_uuid=True)')) {
        console.log(`${colors.yellow}Warning: File ${colors.white}${path.relative(rootDir, file)}${colors.yellow} might have inconsistent UUID type declaration${colors.reset}`);
        warnings++;
      }
    }
  });
  
  console.log(`Checked ${uuidPatterns} files with UUID patterns`);
}

/**
 * Check for proper handling of client and server components in Next.js
 */
function checkNextJsComponentSeparation() {
  console.log(`\n${colors.magenta}Checking for proper Next.js client/server component separation...${colors.reset}`);
  
  const appDirComponents = getAllFiles(path.join(srcDir, 'app')).filter(file => 
    file.endsWith('.tsx') || file.endsWith('.jsx')
  );
  
  appDirComponents.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const isClientComponent = content.includes("'use client'") || content.includes('"use client"');
    
    // Check for client-side hooks in server components
    if (!isClientComponent) {
      const clientHooks = ['useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo', 'useRef'];
      
      for (const hook of clientHooks) {
        if (content.includes(hook)) {
          console.log(`${colors.red}Error: Server component ${colors.white}${path.relative(rootDir, file)}${colors.red} uses client-side hook ${colors.white}${hook}${colors.reset}`);
          errors++;
          break;
        }
      }
    }
    
    // Check for proper imports in client components
    if (isClientComponent) {
      // Check for improper imports from server-only modules
      if (content.includes("from 'server-only'") || content.includes('from "server-only"')) {
        console.log(`${colors.red}Error: Client component ${colors.white}${path.relative(rootDir, file)}${colors.red} imports from server-only module${colors.reset}`);
        errors++;
      }
    }
  });
  
  console.log(`Checked ${appDirComponents.length} components in app directory`);
}

/**
 * Check for DashboardLayout issues
 */
function checkDashboardLayoutStructure() {
  console.log(`\n${colors.magenta}Checking for DashboardLayout structure issues...${colors.reset}`);
  
  const dashboardPages = getAllFiles(path.join(srcDir, 'app', 'dashboard')).filter(file => 
    (file.endsWith('.tsx') || file.endsWith('.jsx')) && !file.includes('layout.tsx')
  );
  
  dashboardPages.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for nested DashboardLayout components
    const dashboardLayoutMatches = content.match(/<DashboardLayout/g);
    if (dashboardLayoutMatches && dashboardLayoutMatches.length > 1) {
      console.log(`${colors.red}Error: File ${colors.white}${path.relative(rootDir, file)}${colors.red} has nested DashboardLayout components${colors.reset}`);
      errors++;
    }
    
    // Check for mismatched closing tags
    const openTags = content.match(/<DashboardLayout/g) || [];
    const closeTags = content.match(/<\/DashboardLayout>/g) || [];
    
    if (openTags.length !== closeTags.length) {
      console.log(`${colors.red}Error: File ${colors.white}${path.relative(rootDir, file)}${colors.red} has mismatched DashboardLayout tags${colors.reset}`);
      errors++;
    }
  });
  
  console.log(`Checked ${dashboardPages.length} dashboard pages`);
}

/**
 * Run type checking
 */
function runTypeCheck() {
  console.log(`\n${colors.magenta}Running TypeScript type checking...${colors.reset}`);
  
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log(`${colors.green}✓ TypeScript type checking passed${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}× TypeScript type checking failed${colors.reset}`);
    console.log(`${colors.yellow}Run 'npx tsc --noEmit' for detailed errors${colors.reset}`);
    errors++;
  }
}

/**
 * Check for theme object consistency
 */
function checkThemeObjectConsistency() {
  console.log(`\n${colors.magenta}Checking for theme object consistency...${colors.reset}`);
  
  const themeFiles = getAllFiles(srcDir).filter(file => 
    file.includes('theme') && (file.endsWith('.ts') || file.endsWith('.tsx'))
  );
  
  themeFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for theme objects with missing required properties
    if (content.includes('ThemeColors') || content.includes('theme: Theme')) {
      const hasColors = content.includes('colors:');
      const hasError = content.includes('error:');
      const hasSuccess = content.includes('success:');
      const hasWarning = content.includes('warning:');
      
      if (hasColors && (!hasError || !hasSuccess || !hasWarning)) {
        console.log(`${colors.yellow}Warning: Theme object in ${colors.white}${path.relative(rootDir, file)}${colors.yellow} might be missing required color properties${colors.reset}`);
        warnings++;
      }
    }
  });
  
  console.log(`Checked ${themeFiles.length} theme-related files`);
}

// Run all checks
checkMissingImports();
checkUuidConsistency();
checkNextJsComponentSeparation();
checkDashboardLayoutStructure();
checkThemeObjectConsistency();
runTypeCheck();

// Summary
console.log(`\n${colors.cyan}Build Verification Summary${colors.reset}`);
console.log(`${colors.cyan}=========================${colors.reset}`);
console.log(`${colors.red}Errors: ${errors}${colors.reset}`);
console.log(`${colors.yellow}Warnings: ${warnings}${colors.reset}`);
console.log(`${colors.green}Fixes applied: ${fixes}${colors.reset}`);

if (errors > 0) {
  console.log(`\n${colors.red}Build verification failed. Please fix the errors before deploying.${colors.reset}`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\n${colors.yellow}Build verification completed with warnings. Review warnings before deploying.${colors.reset}`);
  process.exit(0);
} else {
  console.log(`\n${colors.green}Build verification successful! Your codebase looks ready for deployment.${colors.reset}`);
  process.exit(0);
}
