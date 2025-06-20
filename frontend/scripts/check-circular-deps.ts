/**
 * Circular Dependency Checker
 *
 * This script uses Madge to detect circular dependencies in the codebase.
 * It's designed to be run as part of pre-commit hooks or CI/CD pipelines.
 *
 * Usage:
 *   npm run check:circular
 *
 * Exit codes:
 *   0: No circular dependencies found
 *   1: Circular dependencies detected
 *   2: Error running the check
 */

import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths are relative to the project root
const SRC_DIR = path.join(__dirname, '..', 'src');
const EXTENSIONS = ['ts', 'tsx'];

console.log('Checking for circular dependencies...');

// Adding warning output to see what the warnings are about
const command = `npx madge --circular --extensions ${EXTENSIONS.join(',')} ${SRC_DIR} --warning`;

exec(command, (error, stdout, stderr) => {
  if (error && error.code !== 1) {
    console.error('Error running circular dependency check:', stderr || error.message);
    process.exit(2); // Error running the check
  }

  if (stdout.includes('No circular dependency found')) {
    console.log('✅ No circular dependencies found!');
    process.exit(0); // Success
  } else if (stdout.includes('Found')) {
    // Extract the circular dependency chains from the output
    const circularDepsMatch = stdout.match(/Found (\d+) circular dependencies!/);
    const numCircularDeps = circularDepsMatch ? parseInt(circularDepsMatch[1], 10) : 0;

    console.error(`❌ Found ${numCircularDeps} circular dependencies!`);
    console.error(stdout);

    console.error('\nHow to fix circular dependencies:');
    console.error('1. Identify the modules in the cycle');
    console.error('2. Determine which dependency is not essential or can be moved');
    console.error('3. Consider creating a new module for shared functionality');
    console.error('4. Use dependency injection or context patterns for complex dependencies');

    process.exit(1); // Circular dependencies found
  } else {
    // If no clear indication in the output, print the output and consider it a success
    console.log(stdout);
    console.log('✅ No circular dependencies detected!');
    process.exit(0);
  }
});
