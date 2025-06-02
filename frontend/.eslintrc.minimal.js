// Minimal ESLint config to fix the import/order rule issue
// Extremely minimal ESLint configuration to get past validation errors
module.exports = {
  root: true, // This prevents ESLint from looking for configs in parent directories
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
  plugins: [
    '@typescript-eslint',
    'react',
    'prettier',
    'import',
  ],
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
    
    // Clean import/order rule without any unsupported properties
    'import/order': [
      'warn',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling'],
          'index',
          'object',
          'type',
        ],
        pathGroups: [
          {
            pattern: '@/modules/core/**',
            group: 'internal',
            position: 'before',
          },
          {
            pattern: '@/**',
            group: 'internal',
            position: 'after',
          },
        ],
        pathGroupsExcludedImportTypes: [],
        newlinesBetween: 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        }
      },
    ],
    
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      {
        prefer: 'type-imports',
        disallowTypeAnnotations: false,
      },
    ],
    
    // Enforce modular monolith architecture boundaries
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          '*models*',
          '*types*',
          '*services*',
          '*components*',
          '*contexts*',
          '*lib*',
          '*api*',
          {
            group: ['**/types/*'],
            message:
              'Do not import from bridge files. Use direct module imports instead. Example: import { Status } from @/modules/core/models/base instead of import { DraftStatus } from ../types/storefrontEditor',
          },
          {
            group: ['**/src/types'],
            message:
              'Creating new bridge files is not allowed. Create types in their proper module directory.',
          },
          {
            group: ['@storefront/models/*'],
            importNames: ['default'],
            message:
              'Do not use default exports for models. Use named exports instead.',
          },
          {
            group: ['@/modules/storefront/models/asset'],
            message:
              'Do not import Asset or AssetType from legacy models. Use DTOs from /lib/api/storefrontEditor.types instead.',
          },
          {
            group: ['@/modules/storefront/models/banner'],
            message:
              'Do not import Banner or BannerType from legacy models. Use DTOs from /lib/api/storefrontEditor.types instead.',
          },
          {
            group: ['@/modules/storefront/models/logo'],
            message:
              'Do not import Logo or LogoType from legacy models. Use DTOs from /lib/api/storefrontEditor.types instead.',
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
