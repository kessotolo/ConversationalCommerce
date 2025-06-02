# ESLint Fix Scripts

This directory contains scripts for fixing ESLint issues across the codebase:

## Primary Scripts

- **fix-architectural-issues.js**: Fixes imports to respect modular architecture boundaries
- **fix-unused-variables.js**: Removes or comments out unused variables and imports
- **fix-hook-dependencies.js**: Fixes React Hook dependency arrays
- **fix-nextjs-images.js**: Replaces HTML img tags with Next.js Image components
- **fix-typescript-parsing-errors.js**: Fixes TypeScript parsing errors, especially in StorefrontEditor components

## Running the Scripts

```bash
# Make script executable
chmod +x scripts/script-name.js

# Run the script
node scripts/script-name.js
```

## Remaining Issues

Some issues are handled via ESLint configuration overrides in .eslintrc.js rather than code changes:

1. Unused variables in API bridge files (transitional technical debt)
2. Legacy JSX files (pending migration to TypeScript)
3. React Hook dependency warnings in some monitoring components (need manual review)
4. HTML img tags still present in some components (pending Next.js Image migration)

See the project architecture documentation for more details on the modular boundaries being enforced.
