#!/usr/bin/env node

/**
 * Import Fixer Script for ADR-0001 Implementation
 * 
 * This script automatically fixes missing imports across the codebase by:
 * 1. Adding proper Lucide icon imports
 * 2. Adding proper UI component imports
 * 3. Adding proper Next.js component imports
 * 
 * It follows the direct module imports principle from ADR-0001
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

console.log('\n🔧 Fixing missing imports throughout the codebase...');

// Common patterns that need fixing based on build errors
const importFixes = [
  // Lucide React icons - these are very common in the error log
  {
    regex: /\b(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|ArrowUpRight|Check|CheckCheck|CheckCircle|X|Search|Send|Clock|RefreshCw|RefreshCcw|Truck|AlertTriangle|MessageCircle|MessageSquare|Printer|Package|Calendar|MapPin|User|Phone|Video|MoreVertical|ImageIcon|Save|Bell|Globe|CreditCard|PlusCircle|Download|DollarSign|Users|ShoppingBag|Eye|EyeOff|Trash2|Upload|Camera|Copy|ChevronRight|ChevronLeft|Store)\b/g,
    import: (matches) => {
      // Get unique icons
      const uniqueIcons = [...new Set(matches)];
      return `import { ${uniqueIcons.join(', ')} } from 'lucide-react';`;
    },
    condition: (content, matches) => {
      // Only add import if the file doesn't already import these icons
      const uniqueIcons = [...new Set(matches)];
      const existingImport = content.match(/import\s+\{[^}]*\}\s+from\s+['"]lucide-react['"]/g);
      
      if (!existingImport) return true;

      // Check if all matched icons are already covered by existing imports
      return uniqueIcons.some(icon => {
        const iconPattern = new RegExp(`\\b${icon}\\b`);
        return !existingImport.some(imp => iconPattern.test(imp));
      });
    }
  },
  
  // UI Components from local UI library
  {
    regex: /\b(Card|CardHeader|CardTitle|CardDescription|CardContent|CardFooter)\b/g,
    import: (matches) => {
      // Get unique components
      const uniqueComponents = [...new Set(matches)];
      return `import { ${uniqueComponents.join(', ')} } from '@/components/ui/Card';`;
    },
    condition: (content) => !content.includes("from '@/components/ui/Card'")
  },
  
  // Next.js Link component
  {
    regex: /\bLink\b/g,
    import: () => `import Link from 'next/link';`,
    condition: (content) => !content.includes("import Link") && !content.includes("LinkIcon")
  },
  
  // Next.js Image component
  {
    regex: /\bImage\b/g,
    import: () => `import Image from 'next/image';`,
    condition: (content) => !content.includes("import Image") && !content.includes("from '@/components/OptimizedImage'")
  }
];

// Find all TypeScript and JavaScript files
const files = glob.sync(path.join(SRC_DIR, '**/*.{ts,tsx,js,jsx}'));
let fixedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  let newImports = [];
  let hasChanges = false;
  
  importFixes.forEach(fix => {
    // Check for usage of the component/icon without an import
    const matches = content.match(fix.regex);
    
    if (matches && fix.condition(content, matches)) {
      newImports.push(fix.import(matches));
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    // Add new imports after existing imports
    const lastImportIndex = content.lastIndexOf('import');
    if (lastImportIndex > -1) {
      let endOfImports = content.indexOf(';', lastImportIndex);
      if (endOfImports > -1) {
        // Insert after the last import
        const updatedContent = 
          content.substring(0, endOfImports + 1) + 
          '\n' + newImports.join('\n') + 
          content.substring(endOfImports + 1);
        
        fs.writeFileSync(file, updatedContent);
        console.log(`✅ Fixed imports in: ${path.relative(ROOT_DIR, file)}`);
        fixedFiles++;
      }
    }
  }
});

console.log(`\n🎉 Fixed imports in ${fixedFiles} files!`);
console.log('You may still need to manually fix some specific component imports that are domain-specific.');
