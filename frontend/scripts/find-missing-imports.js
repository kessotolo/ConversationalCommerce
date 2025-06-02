#!/usr/bin/env node

/**
 * This script scans the codebase for potential missing imports
 * related to icons, components, and auth modules.
 *
 * It looks for:
 * 1. JSX elements that might be undefined
 * 2. References to icon libraries without imports
 * 3. Auth-related function calls without imports
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { execSync } = require('child_process');

// Configuration
const SRC_DIR = path.resolve(__dirname, '../src');
const RESULTS_FILE = path.resolve(__dirname, '../missing-imports-report.json');

// Patterns to look for
const PATTERNS = {
  // React components without imports (capitalized JSX elements)
  components: /\<([A-Z][a-zA-Z0-9]*).*?\/?\>/g,

  // Icon libraries without imports
  icons: /[^a-zA-Z](Icon|FaIcon|MdIcon|IoIcon|BiIcon|AiIcon|RiIcon|CgIcon)[a-zA-Z]*/g,

  // Auth-related functions without imports
  auth: /\b(useAuth|getToken|isAuthenticated|signIn|signOut|requireAuth)\(/g,
};

// File extensions to check
const FILE_EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js'];

// Files and directories to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  'test',
  'tests',
  '__tests__',
  'storybook',
  'stories',
  'spec.ts',
  'spec.tsx',
  'spec.js',
  'spec.jsx',
];

/**
 * Checks if a file should be excluded based on its path
 */
function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some((pattern) => filePath.includes(pattern));
}

/**
 * Extracts import statements from a file
 */
function extractImports(content) {
  const importRegex =
    /import\s+(?:{([^}]+)}|\*\s+as\s+([a-zA-Z0-9_]+)|([a-zA-Z0-9_]+))\s+from\s+(['"][^'"]+['"])/g;
  const imports = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    if (match[1]) {
      // Named imports
      const namedImports = match[1].split(',').map((i) => i.trim().split(' as ')[0].trim());
      imports.push(...namedImports);
    }
    if (match[2]) {
      // Namespace import
      imports.push(match[2]);
    }
    if (match[3]) {
      // Default import
      imports.push(match[3]);
    }
  }

  return imports;
}

/**
 * Scans a file for potential missing imports
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const imports = extractImports(content);
    const results = {};

    // Check for each pattern
    Object.entries(PATTERNS).forEach(([category, pattern]) => {
      const matches = [];
      let match;

      while ((match = pattern.exec(content)) !== null) {
        const symbol = match[1] || match[0].trim();

        // Check if the symbol is imported
        if (!imports.includes(symbol) && !symbol.includes('.') && symbol !== 'Icon') {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          matches.push({
            symbol,
            lineNumber,
            context: content.split('\n')[lineNumber - 1].trim(),
          });
        }
      }

      if (matches.length > 0) {
        results[category] = matches;
      }
    });

    if (Object.keys(results).length > 0) {
      return {
        file: filePath.replace(process.cwd(), ''),
        issues: results,
      };
    }
  } catch (error) {
    console.error(`Error scanning ${filePath}:`, error.message);
  }

  return null;
}

/**
 * Recursively scans a directory for files
 */
function scanDirectory(dir) {
  const results = [];

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (shouldExcludeFile(filePath)) {
      continue;
    }

    if (stat.isDirectory()) {
      results.push(...scanDirectory(filePath));
    } else if (FILE_EXTENSIONS.includes(path.extname(filePath))) {
      const result = scanFile(filePath);
      if (result) {
        results.push(result);
      }
    }
  }

  return results;
}

/**
 * Main function
 */
function main() {
  console.log('Scanning for missing imports...');
  const startTime = Date.now();

  // Scan the src directory
  const results = scanDirectory(SRC_DIR);

  // Write results to file
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

  // Calculate statistics
  const totalFiles = results.length;
  const categoryCounts = {
    components: 0,
    icons: 0,
    auth: 0,
  };

  results.forEach((result) => {
    Object.keys(result.issues).forEach((category) => {
      categoryCounts[category] += result.issues[category].length;
    });
  });

  // Output summary
  console.log('\nScan completed in', ((Date.now() - startTime) / 1000).toFixed(2), 'seconds');
  console.log(`Found ${totalFiles} files with potential missing imports:`);
  console.log(`- Components: ${categoryCounts.components} potential issues`);
  console.log(`- Icons: ${categoryCounts.icons} potential issues`);
  console.log(`- Auth: ${categoryCounts.auth} potential issues`);
  console.log(`\nDetailed results saved to: ${RESULTS_FILE}`);

  // Display top files with issues
  console.log('\nTop files with most issues:');
  results
    .sort((a, b) => {
      const aCount = Object.values(a.issues).flat().length;
      const bCount = Object.values(b.issues).flat().length;
      return bCount - aCount;
    })
    .slice(0, 5)
    .forEach((result) => {
      const issueCount = Object.values(result.issues).flat().length;
      console.log(`- ${result.file}: ${issueCount} potential issues`);
    });
}

main();
