#!/usr/bin/env node

/**
 * This script identifies and optionally fixes unused variables and imports in the codebase.
 * It leverages ESLint to find issues and provides recommendations for fixing them.
 *
 * Usage:
 * - node scripts/fix-unused-vars.js --report        # Only generate a report
 * - node scripts/fix-unused-vars.js --auto-fix      # Fix issues automatically
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { execSync } = require('child_process');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

// Configuration
const SRC_DIR = path.resolve(__dirname, '../src');
const REPORT_FILE = path.resolve(__dirname, '../unused-vars-report.json');
const HIGH_PRIORITY_DIRS = ['pages', 'contexts', 'components/StorefrontEditor', 'modules/core'];

// Parse command line arguments
const args = process.argv.slice(2);
const shouldFix = args.includes('--auto-fix');
// Used indirectly in main() when shouldFix is false
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const reportOnly = args.includes('--report') || !shouldFix;

// ESLint rule to check for unused variables and imports
const LINT_RULE = '@typescript-eslint/no-unused-vars';

/**
 * Generate a report of unused variables and imports
 */
const generateReport = () => {
  console.log('Generating report of unused variables and imports...');

  try {
    const result = execSync(
      `npx eslint --rule '${LINT_RULE}: error' --format json "${SRC_DIR}/**/*.{ts,tsx}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    );

    // Parse the JSON output
    const lintResults = JSON.parse(result);

    // Filter for unused variables and imports
    const unusedVarsReport = lintResults.filter((file) =>
      file.messages.some((msg) => msg.ruleId === LINT_RULE),
    );

    // Sort by priority directories
    unusedVarsReport.sort((a, b) => {
      const aPriority = getPriorityIndex(a.filePath);
      const bPriority = getPriorityIndex(b.filePath);
      return aPriority - bPriority;
    });

    // Write the report to a file
    fs.writeFileSync(REPORT_FILE, JSON.stringify(unusedVarsReport, null, 2));

    // Print a summary
    console.log(`\nFound ${unusedVarsReport.length} files with unused variables or imports.`);
    console.log(`Full report written to: ${REPORT_FILE}`);

    // Print summary by directory
    const directorySummary = {};
    unusedVarsReport.forEach((file) => {
      const relPath = path.relative(SRC_DIR, file.filePath);
      const directory = path.dirname(relPath);

      if (!directorySummary[directory]) {
        directorySummary[directory] = 0;
      }

      directorySummary[directory] += file.messages.filter((msg) => msg.ruleId === LINT_RULE).length;
    });

    console.log('\nUnused variables/imports by directory:');
    Object.entries(directorySummary)
      .sort((a, b) => b[1] - a[1])
      .forEach(([dir, count]) => {
        console.log(`  ${dir}: ${count} issues`);
      });

    return unusedVarsReport;
  } catch (error) {
    console.error('Error generating report:', error.message);
    process.exit(1);
  }
};

/**
 * Fix unused variables and imports automatically
 */
const fixUnusedVars = (report) => {
  console.log('\nFixing unused variables and imports...');

  // Count total issues
  const totalIssues = report.reduce(
    (sum, file) => sum + file.messages.filter((msg) => msg.ruleId === LINT_RULE).length,
    0,
  );

  console.log(`Attempting to fix ${totalIssues} issues in ${report.length} files...`);

  try {
    execSync(`npx eslint --rule '${LINT_RULE}: error' --fix "${SRC_DIR}/**/*.{ts,tsx}"`, {
      encoding: 'utf8',
    });

    console.log('\nFix completed. Re-running lint to check remaining issues...');

    // Generate a new report to see what's left
    const newReport = generateReport();

    // Count remaining issues
    const remainingIssues = newReport.reduce(
      (sum, file) => sum + file.messages.filter((msg) => msg.ruleId === LINT_RULE).length,
      0,
    );

    console.log(
      `\nFixed ${totalIssues - remainingIssues} issues. ${remainingIssues} issues remain.`,
    );

    if (remainingIssues > 0) {
      console.log('\nSome issues require manual intervention. Common solutions:');
      console.log('1. Remove unused imports and variables');
      console.log('2. For intentionally unused variables, use _ prefix or disable the rule:');
      console.log('   // eslint-disable-next-line @typescript-eslint/no-unused-vars');
    }
  } catch (error) {
    console.error('Error fixing issues:', error.message);
    process.exit(1);
  }
};

/**
 * Get priority index for a file based on directory
 */
const getPriorityIndex = (filePath) => {
  const relPath = path.relative(SRC_DIR, filePath);

  for (let i = 0; i < HIGH_PRIORITY_DIRS.length; i++) {
    if (relPath.startsWith(HIGH_PRIORITY_DIRS[i])) {
      return i;
    }
  }

  return HIGH_PRIORITY_DIRS.length;
};

/**
 * Main execution
 */
const main = () => {
  const report = generateReport();

  if (shouldFix) {
    fixUnusedVars(report);
  } else {
    console.log('\nTo automatically fix issues, run:');
    console.log('node scripts/fix-unused-vars.js --auto-fix');
  }
};

main();
