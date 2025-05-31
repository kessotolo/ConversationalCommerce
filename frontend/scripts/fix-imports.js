#!/usr/bin/env node

/**
 * Import Fixer Script
 * Automatically adds missing imports to files in the codebase
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
  white: '\x1b[37m'
};

console.log(`${colors.cyan}Import Fixer Script${colors.reset}`);
console.log(`${colors.cyan}===================${colors.reset}`);

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
let fixedFiles = 0;
let fixedImports = 0;

// Component import mapping
const componentImportMapping = {
  // Lucide React components
  'ArrowLeft': 'lucide-react',
  'ArrowRight': 'lucide-react',
  'ArrowUp': 'lucide-react',
  'ArrowDown': 'lucide-react',
  'ArrowUpRight': 'lucide-react',
  'Check': 'lucide-react',
  'CheckCheck': 'lucide-react',
  'CheckCircle': 'lucide-react',
  'Clock': 'lucide-react',
  'Download': 'lucide-react',
  'DollarSign': 'lucide-react',
  'Eye': 'lucide-react',
  'MessageCircle': 'lucide-react',
  'MessageSquare': 'lucide-react',
  'MoreVertical': 'lucide-react',
  'Package': 'lucide-react',
  'Phone': 'lucide-react',
  'Printer': 'lucide-react',
  'RefreshCw': 'lucide-react',
  'RefreshCcw': 'lucide-react',
  'Save': 'lucide-react',
  'Search': 'lucide-react',
  'Send': 'lucide-react',
  'ShoppingBag': 'lucide-react',
  'Store': 'lucide-react',
  'Truck': 'lucide-react',
  'Upload': 'lucide-react',
  'User': 'lucide-react',
  'Users': 'lucide-react',
  'Video': 'lucide-react',
  'X': 'lucide-react',
  'Camera': 'lucide-react',
  'Trash2': 'lucide-react',
  'Globe': 'lucide-react',
  'Bell': 'lucide-react',
  'CreditCard': 'lucide-react',
  'MapPin': 'lucide-react',
  'Globe': 'lucide-react',
  'LogOut': 'lucide-react',
  
  // Next.js components
  'Link': 'next/link',
  'Image': 'next/image',
  
  // HTML Element types
  'HTMLInputElement': 'react',
  'HTMLDivElement': 'react',
  'HTMLFormElement': 'react',
  
  // UI components
  'Card': '@/components/ui/card',
  'CardHeader': '@/components/ui/card',
  'CardTitle': '@/components/ui/card',
  'CardDescription': '@/components/ui/card',
  'CardContent': '@/components/ui/card',
  'CardFooter': '@/components/ui/card',
  
  // Custom components
  'StatCard': '@/components/dashboard/StatCard',
  'OnboardingChecklist': '@/components/dashboard/OnboardingChecklist',
  'ActivityEvent': '@/components/admin/ActivityEvent',
  'Navbar': '@/components/Navbar',
  'AddProductModal': '@/components/dashboard/AddProductModal',
  
  // Model types
  'Product': '@/types/product',
  'Order': '@/types/order',
  'File': '@/types/file',
  
  // Heroicons
  'XMarkIcon': '@heroicons/react/24/outline',
  'CheckIcon': '@heroicons/react/24/outline',
  'PencilIcon': '@heroicons/react/24/outline',
  'TrashIcon': '@heroicons/react/24/outline',
  'UserIcon': '@heroicons/react/24/outline',
  'PhoneIcon': '@heroicons/react/24/outline',
  'PhotoIcon': '@heroicons/react/24/outline',
  'FilmIcon': '@heroicons/react/24/outline',
  'DocumentTextIcon': '@heroicons/react/24/outline',
  'DocumentIcon': '@heroicons/react/24/outline',
  'MusicalNoteIcon': '@heroicons/react/24/outline',
  'DocumentPlusIcon': '@heroicons/react/24/outline',
  'ArrowUpTrayIcon': '@heroicons/react/24/outline',
  'ExclamationTriangleIcon': '@heroicons/react/24/outline',
  'LinkIcon': '@heroicons/react/24/outline',
  'CalendarIcon': '@heroicons/react/24/outline',
  'UserGroupIcon': '@heroicons/react/24/outline',
  'Bars3Icon': '@heroicons/react/24/outline',
  'MagnifyingGlassIcon': '@heroicons/react/24/outline',
  'FunnelIcon': '@heroicons/react/24/outline',
  'ClockIcon': '@heroicons/react/24/outline',
  'ShieldCheckIcon': '@heroicons/react/24/outline',
  'TagIcon': '@heroicons/react/24/outline',
  'ClipboardDocumentIcon': '@heroicons/react/24/outline',
  'ArrowUturnLeftIcon': '@heroicons/react/24/outline',
  'ArrowTopRightOnSquareIcon': '@heroicons/react/24/outline',
  'BoltIcon': '@heroicons/react/24/outline',
  'MenuIcon': '@heroicons/react/24/outline',
  
  // MUI Icons
  'ImageIcon': '@mui/icons-material',
};

/**
 * Utility function to recursively get all files in a directory
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
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
 * Extract components used in JSX that might be missing imports
 */
function extractComponentsFromJSX(content) {
  const jsxMatches = content.match(/<([A-Z][A-Za-z0-9_]*)/g) || [];
  return jsxMatches.map(match => match.substring(1));
}

/**
 * Extract imports from a file
 */
function extractImports(content) {
  const importStatements = content.match(/import\s+.*?from\s+['"][^'"]+['"]/g) || [];
  const imports = new Set();
  
  importStatements.forEach(statement => {
    // Extract named imports
    const namedImports = statement.match(/import\s+{([^}]+)}/);
    if (namedImports && namedImports[1]) {
      namedImports[1].split(',').forEach(imp => {
        const trimmedName = imp.trim().split(' as ')[0];
        imports.add(trimmedName);
      });
    }
    
    // Extract default imports
    const defaultImport = statement.match(/import\s+([A-Za-z0-9_]+)\s+from/);
    if (defaultImport && defaultImport[1]) {
      imports.add(defaultImport[1]);
    }
  });
  
  return imports;
}

/**
 * Group imports by source
 */
function groupImportsBySource(components) {
  const importGroups = {};
  
  components.forEach(component => {
    const source = componentImportMapping[component];
    if (source) {
      if (!importGroups[source]) {
        importGroups[source] = [];
      }
      importGroups[source].push(component);
    }
  });
  
  return importGroups;
}

/**
 * Generate import statements for missing components
 */
function generateImportStatements(importGroups) {
  const statements = [];
  
  Object.entries(importGroups).forEach(([source, components]) => {
    if (components.length > 0) {
      if (source === 'react' && components.some(c => c.startsWith('HTML'))) {
        // For HTML element types, we don't add them as named imports
        continue;
      }
      
      statements.push(`import { ${components.sort().join(', ')} } from '${source}';`);
    }
  });
  
  return statements;
}

/**
 * Fix imports in a file
 */
function fixImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract components used in JSX
    const jsxComponents = extractComponentsFromJSX(content);
    
    // Also look for component references in the code that might not be in JSX tags
    const componentRegex = new RegExp(`\\b(${Object.keys(componentImportMapping).join('|')})\\b`, 'g');
    const allMatches = [...content.matchAll(componentRegex)];
    const codeComponents = allMatches.map(match => match[1]);
    
    // Combine both sets of components and remove duplicates
    const components = [...new Set([...jsxComponents, ...codeComponents])];
    
    if (components.length === 0) {
      return false;
    }
    
    // Extract existing imports
    const existingImports = extractImports(content);
    
    // Find missing components
    const missingComponents = components.filter(component => 
      !existingImports.has(component) && 
      componentImportMapping.hasOwnProperty(component)
    );
    
    if (missingComponents.length === 0) {
      return false;
    }
    
    // Group imports by source
    const importGroups = groupImportsBySource(missingComponents);
    
    // Generate import statements
    const importStatements = generateImportStatements(importGroups);
    
    if (importStatements.length === 0) {
      return false;
    }
    
    // Find position to insert imports
    let insertPosition = 0;
    const lines = content.split('\n');
    
    // Check for 'use client' directive
    const useClientRegex = /^(["']use client["'];?)/;
    const useClientIndex = lines.findIndex(line => useClientRegex.test(line.trim()));
    
    if (useClientIndex !== -1) {
      // Insert after 'use client'
      const linesToSkip = useClientIndex + 1;
      insertPosition = lines.slice(0, linesToSkip).join('\n').length + 1;
    } else {
      // Look for first import
      const importRegex = /^import\s+.*?from\s+['"][^'"]+['"];?/;
      const importIndex = lines.findIndex(line => importRegex.test(line.trim()));
      
      if (importIndex !== -1) {
        // Insert at the first import
        insertPosition = lines.slice(0, importIndex).join('\n').length;
        if (insertPosition > 0) insertPosition += 1;
      } else {
        // Skip comments at the top of the file
        let i = 0;
        
        // Skip empty lines
        while (i < lines.length && lines[i].trim() === '') {
          i++;
        }
        
        // Skip single-line comments
        while (i < lines.length && lines[i].trim().startsWith('//')) {
          i++;
        }
        
        // Skip multi-line comments at the beginning
        if (i < lines.length && lines[i].trim().startsWith('/*')) {
          while (i < lines.length && !lines[i].includes('*/')) {
            i++;
          }
          // Skip the line with closing comment
          if (i < lines.length) i++;
        }
        
        // Insert after comments
        insertPosition = lines.slice(0, i).join('\n').length;
        if (insertPosition > 0) insertPosition += 1;
      }
    }
    
    // Insert the new imports
    const newContent = content.slice(0, insertPosition) + 
                       importStatements.join('\n') + 
                       (importStatements.length > 0 ? '\n' : '') +
                       content.slice(insertPosition);
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, newContent);
    
    console.log(`${colors.green}Fixed imports in ${colors.white}${path.relative(rootDir, filePath)}${colors.green}:${colors.reset}`);
    importStatements.forEach(statement => {
      console.log(`  ${colors.blue}+ ${statement}${colors.reset}`);
    });
    
    fixedImports += importStatements.length;
    return true;
  } catch (error) {
    console.error(`${colors.red}Error fixing imports in ${path.relative(rootDir, filePath)}:${colors.reset}`, error);
    return false;
  }
}

/**
 * Main function to fix imports in all files
 */
function fixImportsInFiles() {
  console.log(`${colors.magenta}Scanning for files with missing imports...${colors.reset}`);
  
  // Get all React component files, including those in the app directory
  const tsxFiles = [
    ...getAllFiles(srcDir).filter(file => file.endsWith('.tsx') || file.endsWith('.jsx')),
    ...getAllFiles(path.join(rootDir, 'pages')).filter(file => file.endsWith('.tsx') || file.endsWith('.jsx')),
    ...getAllFiles(path.join(rootDir, 'src', 'app')).filter(file => file.endsWith('.tsx') || file.endsWith('.jsx'))
  ];
  
  // Fix imports in each file
  tsxFiles.forEach(file => {
    const fixed = fixImports(file);
    if (fixed) {
      fixedFiles++;
    }
  });
  
  console.log(`\n${colors.cyan}Import Fixer Summary${colors.reset}`);
  console.log(`${colors.cyan}===================${colors.reset}`);
  console.log(`${colors.green}Fixed ${fixedImports} imports in ${fixedFiles} files${colors.reset}`);
}

// Run the import fixer
fixImportsInFiles();
