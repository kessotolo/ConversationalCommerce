// Ultra-minimal ESLint configuration for pre-commit hooks
// With TypeScript support but no project references
module.exports = {
  root: true, // Prevents ESLint from looking for configs in parent directories
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['eslint:recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'import'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    // Removed project references to avoid conflicts
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'no-unused-vars': 'off', // Turned off in favor of TypeScript version
    '@typescript-eslint/no-unused-vars': 'warn',
    'react/react-in-jsx-scope': 'off',

    // Extremely simplified import/order rule
    'import/order': 'warn',
  },
  ignorePatterns: [
    // Ignore all ESLint config files
    '.eslintrc*.js',
    'node_modules/',
    'dist/',
    '.next/',
    'public/',
    'scripts/**/*',
  ],
};
