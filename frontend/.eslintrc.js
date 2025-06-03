// Simplified ESLint config for the frontend (Next.js/TypeScript) for Netlify compatibility
// This configuration aligns with the modular monolith architecture and enforces best practices
// While ensuring compatibility with Netlify's build environment

module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'next/core-web-vitals',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:prettier/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'prettier', 'import'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: __dirname + '/tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  settings: {
    next: {
      rootDir: 'frontend/',
    },
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {},
    },
  },
  rules: {
    'prettier/prettier': 'error',
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    'import/no-deprecated': 'warn',
    // Bare minimum import/order rule for maximum compatibility
    'import/order': 'warn',
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      {
        prefer: 'type-imports',
        disallowTypeAnnotations: false,
      },
    ],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          '*types*',
          '*bridge*',
          {
            group: ['**/types/*'],
            message:
              'Do not import from bridge files. Use direct module imports instead. See ADR-0001.',
          },
          {
            group: ['**/src/types'],
            message:
              'Creating new bridge files is not allowed. Create types in their proper module directory.',
          },
          {
            group: ['@storefront/models/*'],
            importNames: ['default'],
            message: 'Do not use default exports for models. Use named exports instead.',
          },
          '../*',
          './*',
        ],
        paths: [
          {
            name: '../',
            message: 'Use @/ alias for internal modules instead of relative imports.',
          },
          {
            name: './',
            message: 'Use @/ alias for internal modules instead of relative imports.',
          },
        ],
      },
    ],
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: './src',
            from: './src/modules/*/models',
            except: ['./src/modules/*/index.ts'],
            message:
              'Do not import directly from module internals. Use the module public API (index.ts) instead.',
          },
        ],
      },
    ],
    '@typescript-eslint/no-unsafe-declaration-merging': 'off',
    '@next/next/no-html-link-for-pages': ['error', 'src/app'],
  },
  overrides: [
    {
      files: ['scripts/**/*.js', 'scripts/**/*.ts'],
      parserOptions: {
        project: __dirname + '/scripts/tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    {
      files: ['pages/api/**/*.ts'],
      rules: {
        '@typescript-eslint/no-unsafe-declaration-merging': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: ['src/modules/*/index.ts'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
    {
      files: ['src/modules/*/models/index.ts', 'src/modules/*/services/index.ts'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
    {
      files: ['src/components/store/StoreContent.jsx'],
      rules: {
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'no-unused-vars': 'off',
        '@next/next/no-html-link-for-pages': ['error', 'src/app'],
        'react-hooks/exhaustive-deps': 'off',
        '@next/next/no-img-element': 'off',
      },
    },
    {
      files: ['src/lib/api/*.ts', 'src/lib/api.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    {
      files: ['src/components/products/*.tsx', 'src/components/StorefrontEditor/**/*.tsx'],
      rules: {
        '@next/next/no-img-element': 'warn',
      },
    },
    {
      files: ['src/components/StorefrontEditor/**/*.tsx'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'warn',
      },
    },
    {
      files: ['src/components/monitoring/*.tsx'],
      rules: {
        'react-hooks/exhaustive-deps': 'warn',
      },
    },
    {
      files: ['src/components/StorefrontEditor/BannerLogoManagement/BannerManagement.tsx'],
      rules: {
        'no-useless-escape': 'off',
      },
    },
    {
      files: ['src/components/dashboard/*.tsx'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'warn',
        '@next/next/no-html-link-for-pages': 'warn',
      },
    },
  ],
};
