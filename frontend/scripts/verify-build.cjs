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
  white: '\x1b[37m',
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

  files.forEach((file) => {
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

  // List of built-in HTML/JSX tags and types to ignore
  const builtInTags = new Set([
    // HTML tags
    'div',
    'span',
    'input',
    'form',
    'img',
    'button',
    'ul',
    'li',
    'a',
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'table',
    'thead',
    'tbody',
    'tr',
    'td',
    'th',
    'label',
    'select',
    'option',
    'textarea',
    'svg',
    'path',
    'g',
    'circle',
    'rect',
    'ellipse',
    'polygon',
    'line',
    'polyline',
    'text',
    'defs',
    'clipPath',
    'foreignObject',
    'iframe',
    'canvas',
    'audio',
    'video',
    'source',
    'track',
    'map',
    'area',
    'blockquote',
    'cite',
    'code',
    'col',
    'colgroup',
    'data',
    'datalist',
    'dd',
    'del',
    'details',
    'dfn',
    'dialog',
    'dl',
    'dt',
    'em',
    'embed',
    'fieldset',
    'figcaption',
    'figure',
    'footer',
    'header',
    'hr',
    'i',
    'ins',
    'kbd',
    'legend',
    'main',
    'mark',
    'menu',
    'meter',
    'nav',
    'noscript',
    'object',
    'ol',
    'optgroup',
    'output',
    'picture',
    'pre',
    'progress',
    'q',
    'rp',
    'rt',
    'ruby',
    's',
    'samp',
    'section',
    'small',
    'strong',
    'sub',
    'summary',
    'sup',
    'template',
    'time',
    'u',
    'var',
    'wbr',
    // React Fragments
    'Fragment',
    // HTML element types
    'HTMLDivElement',
    'HTMLInputElement',
    'HTMLFormElement',
    'HTMLButtonElement',
    'HTMLImageElement',
    'HTMLTableElement',
    'HTMLSpanElement',
    'HTMLAnchorElement',
    'HTMLUListElement',
    'HTMLOListElement',
    'HTMLLIElement',
    'HTMLParagraphElement',
    'HTMLHeadingElement',
    'HTMLCanvasElement',
    'HTMLVideoElement',
    'HTMLAudioElement',
    'SVGElement',
    'HTMLElement',
  ]);

  // Get all React component files
  const tsxFiles = getAllFiles(srcDir).filter(
    (file) => file.endsWith('.tsx') || file.endsWith('.jsx'),
  );

  tsxFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');

    // 1. Find all locally defined components/types/interfaces
    const localDefs = new Set();

    // Function, const, or class components
    const localComponentMatches = content.matchAll(
      /(function|const|class)\s+([A-Z][A-Za-z0-9_]*)/g,
    );
    for (const match of localComponentMatches) {
      localDefs.add(match[2]);
    }

    // Types/interfaces
    const localTypeMatches = content.matchAll(/(interface|type)\s+([A-Z][A-Za-z0-9_]*)/g);
    for (const match of localTypeMatches) {
      localDefs.add(match[2]);
    }

    // 2. Find all imported components/types
    const imported = new Set();
    const importMatches = content.matchAll(/import\s+.*?from\s+['"][^'"]+['"]/g);
    for (const match of importMatches) {
      // Named imports
      const named = match[0].match(/import\s+{([^}]+)}/);
      if (named && named[1]) {
        named[1].split(',').forEach((imp) => {
          const trimmed = imp.trim().split(' as ')[0];
          imported.add(trimmed);
        });
      }
      // Default import
      const def = match[0].match(/import\s+([A-Z][A-Za-z0-9_]*)\s+from/);
      if (def && def[1]) {
        imported.add(def[1]);
      }
    }

    // 3. Find all JSX usages
    const jsxMatches = content.matchAll(/<([A-Z][A-Za-z0-9_]*)/g);
    for (const match of jsxMatches) {
      const name = match[1];
      if (!imported.has(name) && !localDefs.has(name) && !builtInTags.has(name)) {
        console.log(
          `${colors.yellow}Warning: Component ${colors.white}${name}${colors.yellow} used in ${colors.white}${path.relative(rootDir, file)}${colors.yellow} might be missing an import${colors.reset}`,
        );
        warnings++;
      }
    }
  });
}

/**
 * Check for UUID handling in database models
 */
function checkUuidConsistency() {
  console.log(
    `\n${colors.magenta}Checking for UUID consistency in database models...${colors.reset}`,
  );

  const modelFiles = getAllFiles(srcDir).filter(
    (file) =>
      (file.endsWith('.ts') || file.endsWith('.tsx')) &&
      !file.endsWith('.test.ts') &&
      !file.endsWith('.test.tsx'),
  );

  let uuidPatterns = 0;

  modelFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');

    // Check for UUID-related patterns
    if (content.includes('UUID') || content.includes('uuid')) {
      uuidPatterns++;

      // Check for proper UUID type handling
      if (content.includes('as_uuid=True') && !content.includes('UUID(as_uuid=True)')) {
        console.log(
          `${colors.yellow}Warning: File ${colors.white}${path.relative(rootDir, file)}${colors.yellow} might have inconsistent UUID type declaration${colors.reset}`,
        );
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
  console.log(
    `\n${colors.magenta}Checking for proper Next.js client/server component separation...${colors.reset}`,
  );

  const appDirComponents = getAllFiles(path.join(srcDir, 'app')).filter(
    (file) => file.endsWith('.tsx') || file.endsWith('.jsx'),
  );

  appDirComponents.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const isClientComponent = content.includes("'use client'") || content.includes('"use client"');

    // Check for client-side hooks in server components
    if (!isClientComponent) {
      const clientHooks = [
        'useState',
        'useEffect',
        'useContext',
        'useReducer',
        'useCallback',
        'useMemo',
        'useRef',
      ];

      for (const hook of clientHooks) {
        if (content.includes(hook)) {
          console.log(
            `${colors.red}Error: Server component ${colors.white}${path.relative(rootDir, file)}${colors.red} uses client-side hook ${colors.white}${hook}${colors.reset}`,
          );
          errors++;
          break;
        }
      }
    }

    // Check for proper imports in client components
    if (isClientComponent) {
      // Check for improper imports from server-only modules
      if (content.includes("from 'server-only'") || content.includes('from "server-only"')) {
        console.log(
          `${colors.red}Error: Client component ${colors.white}${path.relative(rootDir, file)}${colors.red} imports from server-only module${colors.reset}`,
        );
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

  const dashboardPages = getAllFiles(path.join(srcDir, 'app', 'dashboard')).filter(
    (file) => (file.endsWith('.tsx') || file.endsWith('.jsx')) && !file.includes('layout.tsx'),
  );

  dashboardPages.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');

    // Check for nested DashboardLayout components
    const dashboardLayoutMatches = content.match(/<DashboardLayout/g);
    if (dashboardLayoutMatches && dashboardLayoutMatches.length > 1) {
      console.log(
        `${colors.red}Error: File ${colors.white}${path.relative(rootDir, file)}${colors.red} has nested DashboardLayout components${colors.reset}`,
      );
      errors++;
    }

    // Check for mismatched closing tags
    const openTags = content.match(/<DashboardLayout/g) || [];
    const closeTags = content.match(/<\/DashboardLayout>/g) || [];

    if (openTags.length !== closeTags.length) {
      console.log(
        `${colors.red}Error: File ${colors.white}${path.relative(rootDir, file)}${colors.red} has mismatched DashboardLayout tags${colors.reset}`,
      );
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

  const themeFiles = getAllFiles(srcDir).filter(
    (file) => file.includes('theme') && (file.endsWith('.ts') || file.endsWith('.tsx')),
  );

  themeFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');

    // Check for theme objects with missing required properties
    if (content.includes('ThemeColors') || content.includes('theme: Theme')) {
      const hasColors = content.includes('colors:');
      const hasError = content.includes('error:');
      const hasSuccess = content.includes('success:');
      const hasWarning = content.includes('warning:');

      if (hasColors && (!hasError || !hasSuccess || !hasWarning)) {
        console.log(
          `${colors.yellow}Warning: Theme object in ${colors.white}${path.relative(rootDir, file)}${colors.yellow} might be missing required color properties${colors.reset}`,
        );
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
  console.log(
    `\n${colors.red}Build verification failed. Please fix the errors before deploying.${colors.reset}`,
  );
  process.exit(1);
} else if (warnings > 0) {
  console.log(
    `\n${colors.yellow}Build verification completed with warnings. Review warnings before deploying.${colors.reset}`,
  );
  process.exit(0);
} else {
  console.log(
    `\n${colors.green}Build verification successful! Your codebase looks ready for deployment.${colors.reset}`,
  );
  process.exit(0);
}
