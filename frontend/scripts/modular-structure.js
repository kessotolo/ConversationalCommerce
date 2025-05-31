/**
 * Modular Monolith Structure Setup
 * 
 * This script:
 * 1. Fixes import casing issues
 * 2. Prepares the codebase for modular structure
 * 3. Establishes proper module boundaries
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Paths
const SRC_DIR = path.join(__dirname, '..', 'src');
const MODULES_DIR = path.join(SRC_DIR, 'modules');

// Create module structure if it doesn't exist
function createModuleStructure() {
  console.log('🏗️ Creating modular monolith structure...');
  
  // Define our modules
  const modules = [
    'core',
    'tenant',
    'storefront',
    'conversation',
    'product',
    'order',
    'payment',
    'security'
  ];
  
  // Create module directories
  if (!fs.existsSync(MODULES_DIR)) {
    fs.mkdirSync(MODULES_DIR, { recursive: true });
  }
  
  // Create each module with its structure
  modules.forEach(module => {
    const moduleDir = path.join(MODULES_DIR, module);
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir, { recursive: true });
      
      // Create standard directories within each module
      ['models', 'services', 'components', 'hooks', 'utils'].forEach(dir => {
        fs.mkdirSync(path.join(moduleDir, dir), { recursive: true });
      });
      
      // Create index.ts file
      fs.writeFileSync(
        path.join(moduleDir, 'index.ts'),
        `/**
 * ${module.charAt(0).toUpperCase() + module.slice(1)} Module
 * 
 * This module handles ${module}-related functionality in the Conversational Commerce platform.
 */

// Export public interfaces
export * from './models';
export * from './services';
export * from './components';
`
      );
      
      // Create models index
      fs.writeFileSync(
        path.join(moduleDir, 'models', 'index.ts'),
        `/**
 * ${module.charAt(0).toUpperCase() + module.slice(1)} Models
 */

// Export model interfaces
`
      );
      
      // Create services index
      fs.writeFileSync(
        path.join(moduleDir, 'services', 'index.ts'),
        `/**
 * ${module.charAt(0).toUpperCase() + module.slice(1)} Services
 */

// Export service interfaces
`
      );
      
      // Create components index
      fs.writeFileSync(
        path.join(moduleDir, 'components', 'index.ts'),
        `/**
 * ${module.charAt(0).toUpperCase() + module.slice(1)} Components
 */

// Export components
`
      );
    }
  });
  
  // Create module registration file
  fs.writeFileSync(
    path.join(MODULES_DIR, 'index.ts'),
    `/**
 * Module Registration
 * 
 * This file registers all modules in the Conversational Commerce platform.
 */

// Module Imports
${modules.map(m => `import * as ${m}Module from './${m}';`).join('\n')}

// Export all modules
export const modules = {
${modules.map(m => `  ${m}: ${m}Module,`).join('\n')}
};

// Export individual modules
${modules.map(m => `export { ${m}Module };`).join('\n')}
`
  );
  
  console.log('✅ Module structure created!');
}

// Rules for import fixes
const IMPORT_RULES = [
  // Fix casing in imports
  { pattern: /types\/storefrontEditor/g, replacement: 'types/StorefrontEditor' },
  { pattern: /types\/file/g, replacement: 'types/File' },
  { pattern: /types\/product/g, replacement: 'types/Product' },
  { pattern: /types\/order/g, replacement: 'types/Order' },
  { pattern: /types\/notification/g, replacement: 'types/Notification' },
  { pattern: /lib\/api\/storefrontEditor/g, replacement: 'lib/api/StorefrontEditor' },
  
  // Fix circular imports (replace with comment)
  { pattern: /import\s+{\s*(\w+)\s*}\s+from\s+['"]@\/types\/\1['"]/g, replacement: '// Removed circular import' },
  
  // Fix duplicate React imports
  { pattern: /import\s+React\s+from\s+['"]react['"];\s*import\s+React\s+from\s+['"]react['"];/g, replacement: 'import React from \'react\';' },
  { pattern: /import\s+{\s*React\s*}\s+from\s+['"]react['"];/g, replacement: '' },
  
  // Fix Record import from React
  { pattern: /import\s+{\s*Record\s*}\s+from\s+['"]react['"];/g, replacement: '// Removed invalid Record import' },
  
  // Fix component self-imports
  { pattern: /import\s+{\s*([A-Za-z0-9]+)(,\s*[A-Za-z0-9]+Props)?\s*}\s+from\s+['"]@\/components\/.+\/\1['"];/g, replacement: '// Removed self-import' },
];

// Process a single file
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let modified = false;
    
    // Handle "use client" directive placement
    if (content.includes('"use client"') && !content.startsWith('"use client"')) {
      content = content.replace(/["']use client["'];?\n?/g, '');
      content = '"use client";\n\n' + content;
      modified = true;
    }
    
    // Apply import rules
    IMPORT_RULES.forEach(rule => {
      const newContent = content.replace(rule.pattern, rule.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    // Write changes if modified
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed imports in ${filePath.replace(__dirname + '/../', '')}`);
    }
    
    return modified;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

// Find and process all TypeScript/React files
function fixImports() {
  console.log('🔍 Scanning for import issues...');
  
  const files = glob.sync([
    path.join(SRC_DIR, '**/*.ts'),
    path.join(SRC_DIR, '**/*.tsx'),
    path.join(SRC_DIR, '**/*.js'),
    path.join(SRC_DIR, '**/*.jsx'),
  ]);
  
  let fixedCount = 0;
  
  files.forEach((file, index) => {
    if (processFile(file)) {
      fixedCount++;
    }
    
    if ((index + 1) % 20 === 0 || index === files.length - 1) {
      console.log(`Processed ${index + 1}/${files.length} files...`);
    }
  });
  
  console.log(`\n✅ Fixed ${fixedCount} files with import issues`);
}

// Fix specific type files with known issues
function fixTypeFiles() {
  console.log('🔧 Fixing known type file issues...');
  
  const TYPES_DIR = path.join(SRC_DIR, 'types');
  
  // Fix StorefrontEditor.ts
  const storefrontEditorPath = path.join(TYPES_DIR, 'StorefrontEditor.ts');
  if (fs.existsSync(storefrontEditorPath)) {
    let content = fs.readFileSync(storefrontEditorPath, 'utf8');
    content = content.replace(/import\s+{[^}]+}\s+from\s+['"]@\/components\/StorefrontEditor\/[^'"]+['"]/g, 
      '// Import removed to avoid circular dependencies');
    fs.writeFileSync(storefrontEditorPath, content, 'utf8');
    console.log('  Fixed StorefrontEditor.ts');
  }
  
  // Fix circular imports in other type files
  ['Product.ts', 'Order.ts', 'Notification.ts', 'File.ts'].forEach(file => {
    const filePath = path.join(TYPES_DIR, file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      content = content.replace(/import\s+{[^}]+}\s+from\s+['"]@\/types\/[^'"]+['"]/g, 
        '// Removed circular import');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  Fixed ${file}`);
    }
  });
}

// Add ESLint rules for module boundaries
function addModuleBoundaryRules() {
  console.log('🔧 Adding ESLint rules for module boundaries...');
  
  const eslintConfigPath = path.join(__dirname, '..', '.eslintrc.js');
  
  if (fs.existsSync(eslintConfigPath)) {
    let content = fs.readFileSync(eslintConfigPath, 'utf8');
    
    // Only add if not already present
    if (!content.includes('boundaries/element-types')) {
      const rulesToAdd = `
  rules: {
    // Module boundary rules
    'boundaries/element-types': [
      2,
      {
        default: 'disallow',
        rules: [
          {
            from: 'core',
            allow: ['core']
          },
          {
            from: 'tenant',
            allow: ['core', 'tenant']
          },
          {
            from: 'storefront',
            allow: ['core', 'tenant', 'storefront']
          },
          {
            from: 'conversation',
            allow: ['core', 'tenant', 'conversation']
          },
          {
            from: 'product',
            allow: ['core', 'tenant', 'product']
          },
          {
            from: 'order',
            allow: ['core', 'tenant', 'product', 'order']
          },
          {
            from: 'payment',
            allow: ['core', 'tenant', 'order', 'payment']
          },
          {
            from: 'security',
            allow: ['core', 'tenant', 'security']
          }
        ]
      }
    ],
    // Other rules...`;
      
      // Add the rules
      content = content.replace(/rules:\s*{/, rulesToAdd);
      fs.writeFileSync(eslintConfigPath, content, 'utf8');
      console.log('  Added module boundary rules to ESLint config');
    } else {
      console.log('  Module boundary rules already present');
    }
  } else {
    console.log('  ESLint config not found, skipping');
  }
}

// Create documentation for modular structure
function createModuleDocumentation() {
  console.log('📝 Creating module documentation...');
  
  const docsDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  const modulesDocPath = path.join(docsDir, 'modular-architecture.md');
  
  fs.writeFileSync(modulesDocPath, `# Modular Monolith Architecture

## Overview

The Conversational Commerce platform uses a modular monolith architecture, inspired by Shopify's approach. This architecture provides clear boundaries between different parts of the system while maintaining the simplicity of a single deployment unit.

## Module Structure

Each module follows this structure:

\`\`\`
/modules
  /<module-name>
    /models      # Data models and interfaces
    /services    # Business logic
    /components  # UI components
    /hooks       # React hooks
    /utils       # Module-specific utilities
\`\`\`

## Modules

### Core Module

The Core module contains foundational elements used across the platform:
- Base types (UUID, Entity, etc.)
- Shared utilities
- Cross-cutting concerns

### Tenant Module

The Tenant module handles multi-tenant functionality:
- Tenant registration and management
- Tenant-specific settings
- Tenant isolation

### Storefront Module

The Storefront module manages merchant storefronts:
- Storefront themes and customization
- Storefront navigation
- Storefront pages

### Conversation Module

The Conversation module handles messaging functionality:
- WhatsApp integration
- Message templating
- Conversation flows
- Message history

### Product Module

The Product module manages product catalogs:
- Product information
- Categories and collections
- Inventory management
- Media management

### Order Module

The Order module handles order processing:
- Order creation and management
- Fulfillment tracking
- Order history

### Payment Module

The Payment module manages payment processing:
- Payment method integration
- Transaction handling
- Payment status tracking

### Security Module

The Security module handles security concerns:
- Authentication
- Authorization
- Audit logging
- Content moderation

## Module Interaction Rules

Modules can only depend on:
1. The Core module
2. Themselves
3. Explicitly allowed dependencies

This ensures clean separation of concerns and prevents circular dependencies.

## Development Guidelines

When working with this architecture:

1. Place new code in the appropriate module
2. Follow the dependency rules
3. Export only what's necessary through the module's public API
4. Use interfaces to define contracts between modules
`);
  
  console.log('  Created module documentation');
}

// Main execution
console.log('🚀 Setting up modular monolith architecture...');
createModuleStructure();
fixTypeFiles();
fixImports();
addModuleBoundaryRules();
createModuleDocumentation();
console.log('✨ All done! Modular monolith architecture has been set up.');
