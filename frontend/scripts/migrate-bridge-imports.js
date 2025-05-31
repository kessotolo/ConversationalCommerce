/**
 * Migration script to replace bridge file imports with direct module imports
 * 
 * This script finds all imports from bridge files like:
 * import { Type } from '../types/storefrontEditor';
 * 
 * And replaces them with direct module imports like:
 * import type { Type } from '@/modules/storefront/models/type';
 * 
 * Usage: node scripts/migrate-bridge-imports.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Maps bridge file types to their module sources
const typeMapping = {
  // Base types
  'UUID': { module: '@/modules/core/models/base', isType: true },
  'Entity': { module: '@/modules/core/models/base', isType: true },
  'TenantScoped': { module: '@/modules/core/models/base', isType: true },
  'Draftable': { module: '@/modules/core/models/base', isType: true },
  'PaginatedResult': { module: '@/modules/core/models/base', isType: true },
  'Status': { module: '@/modules/core/models/base', isType: false },
  'DraftStatus': { module: '@/modules/core/models/base', isType: false, originalName: 'Status' },
  
  // Draft types
  'Draft': { module: '@/modules/storefront/models/draft', isType: true },
  'DraftList': { module: '@/modules/storefront/models/draft', isType: true },
  
  // Version types
  'Version': { module: '@/modules/storefront/models/version', isType: true },
  'VersionList': { module: '@/modules/storefront/models/version', isType: true },
  'VersionDiff': { module: '@/modules/storefront/models/version', isType: true },
  
  // Permission types
  'Permission': { module: '@/modules/storefront/models/permission', isType: true },
  'UserPermission': { module: '@/modules/storefront/models/permission', isType: true },
  'UserPermissionsList': { module: '@/modules/storefront/models/permission', isType: true },
  'StorefrontRole': { module: '@/modules/storefront/models/permission', isType: false },
  'StorefrontSectionType': { module: '@/modules/storefront/models/permission', isType: false },
  
  // Audit types
  'AuditLogEntry': { module: '@/modules/storefront/models/audit', isType: true },
  
  // Asset types
  'Asset': { module: '@/modules/storefront/models/asset', isType: true },
  'AssetList': { module: '@/modules/storefront/models/asset', isType: true },
  'AssetType': { module: '@/modules/storefront/models/asset', isType: false },
  
  // Banner types
  'Banner': { module: '@/modules/storefront/models/banner', isType: true },
  'BannerList': { module: '@/modules/storefront/models/banner', isType: true },
  'BannerType': { module: '@/modules/storefront/models/banner', isType: false },
  'BannerStatus': { module: '@/modules/storefront/models/banner', isType: false },
  'TargetAudience': { module: '@/modules/storefront/models/banner', isType: false },
  
  // Logo types
  'Logo': { module: '@/modules/storefront/models/logo', isType: true },
  'LogoList': { module: '@/modules/storefront/models/logo', isType: true },
  'LogoType': { module: '@/modules/storefront/models/logo', isType: false },
  'LogoStatus': { module: '@/modules/storefront/models/logo', isType: false },
  
  // Component types
  'Component': { module: '@/modules/storefront/models/component', isType: true },
  'ComponentList': { module: '@/modules/storefront/models/component', isType: true },
  'ComponentUsage': { module: '@/modules/storefront/models/component', isType: true },
  'ComponentType': { module: '@/modules/storefront/models/component', isType: false },
  'ComponentStatus': { module: '@/modules/storefront/models/component', isType: false },
  
  // Template types
  'PageTemplate': { module: '@/modules/storefront/models/template', isType: true },
  'PageTemplateList': { module: '@/modules/storefront/models/template', isType: true },
  'PageTemplateType': { module: '@/modules/storefront/models/template', isType: false },
  'TemplateStatus': { module: '@/modules/storefront/models/template', isType: false },

  
  // Theme types
  'Theme': { module: '@/modules/theme/models/theme', isType: true },
  'ThemeColors': { module: '@/modules/theme/models/theme', isType: true },
  'ThemeTypography': { module: '@/modules/theme/models/theme', isType: true },
  'ThemeLayout': { module: '@/modules/theme/models/theme', isType: true },
  'ThemeComponentStyles': { module: '@/modules/theme/models/theme', isType: true },
  
  // Monitoring types
  'Rule': { module: '@/modules/monitoring/models/rule', isType: true },
  'RuleSeverity': { module: '@/modules/monitoring/models/rule', isType: false },
  'RuleCondition': { module: '@/modules/monitoring/models/rule', isType: true },
  'Activity': { module: '@/modules/monitoring/models/activity', isType: true },
  
  // Violation types
  'Violation': { module: '@/modules/violation/models/violation', isType: true },
  'ViolationStats': { module: '@/modules/violation/models/violation', isType: true },
  'ViolationTrend': { module: '@/modules/violation/models/violation', isType: true }
};

// Bridge file patterns to search for
const bridgeFiles = [
  'types/storefrontEditor',
  'types/theme',
  'types/monitoring',
  'types/violation'
];

console.log('Starting bridge import migration...');

// Find all TypeScript files (excluding node_modules and .next)
const files = glob.sync('src/**/*.{ts,tsx}', {
  ignore: ['src/modules/**', '**/node_modules/**', '**/.next/**']
});

console.log(`Found ${files.length} files to process`);

let totalUpdated = 0;
let totalImportsReplaced = 0;

// Process each file
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let importsReplaced = 0;
  
  // Check for bridge file imports
  bridgeFiles.forEach(bridgeFile => {
    const importRegex = new RegExp(`import\\s+\\{([^}]+)\\}\\s+from\\s+['"].*?${bridgeFile.replace('/', '\\/')}['"]`, 'g');
    
    // Find all bridge imports in this file
    const importMatches = content.match(importRegex);
    if (!importMatches) return;
    
    importMatches.forEach(importStatement => {
      // Extract the imported types
      const typeMatches = importStatement.match(/import\s+\{([^}]+)\}\s+from/);
      if (!typeMatches || !typeMatches[1]) return;
      
      const importedTypes = typeMatches[1].split(',').map(t => t.trim());
      
      // Group imports by module
      const moduleImports = {};
      const typeOnlyImports = {};
      
      importedTypes.forEach(importedType => {
        // Handle aliased imports like "Status as DraftStatus"
        const parts = importedType.split(' as ');
        const typeName = parts[0].trim();
        const alias = parts.length > 1 ? parts[1].trim() : null;
        
        const mapping = typeMapping[typeName] || typeMapping[alias];
        if (!mapping) {
          console.warn(`No mapping found for type: ${importedType} in file: ${file}`);
          return;
        }
        
        const moduleName = mapping.module;
        const isTypeImport = mapping.isType;
        const importGroup = isTypeImport ? typeOnlyImports : moduleImports;
        
        importGroup[moduleName] = importGroup[moduleName] || [];
        
        if (alias && mapping.originalName) {
          // Special case for aliased imports where we know the original name
          importGroup[moduleName].push(`${mapping.originalName} as ${alias}`);
        } else if (alias) {
          // Regular aliased import
          importGroup[moduleName].push(`${typeName} as ${alias}`);
        } else {
          // Regular import
          importGroup[moduleName].push(typeName);
        }
      });
      
      // Create the replacement import statements
      let replacementImports = '';
      
      // Add type-only imports
      Object.keys(typeOnlyImports).forEach(module => {
        const types = typeOnlyImports[module].join(', ');
        replacementImports += `import type { ${types} } from '${module}';\n`;
      });
      
      // Add regular imports
      Object.keys(moduleImports).forEach(module => {
        const types = moduleImports[module].join(', ');
        replacementImports += `import { ${types} } from '${module}';\n`;
      });
      
      // Replace the original import with the new imports
      content = content.replace(importStatement, replacementImports.trim());
      importsReplaced++;
    });
  });
  
  // Only write back to the file if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    totalUpdated++;
    totalImportsReplaced += importsReplaced;
    console.log(`Updated ${file} (${importsReplaced} imports replaced)`);
  }
});

console.log(`\nMigration complete!`);
console.log(`Updated ${totalUpdated} files with ${totalImportsReplaced} import statements replaced.`);
