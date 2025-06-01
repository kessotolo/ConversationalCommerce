#!/usr/bin/env node

/**
 * Fix Card Component Imports Script
 * 
 * This script specifically adds missing Card component imports to files
 * that use these components but don't import them directly.
 * This aligns with ADR-0001's principle of direct module imports.
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const ROOT_DIR = path.resolve(__dirname, '..');
const DASHBOARD_DIR = path.join(ROOT_DIR, 'src/app/dashboard');

console.log('\n🔧 Fixing missing Card component imports...');

// Process a specific file to add missing Card component imports
const processFile = (filePath) => {
  if (!fs.existsSync(filePath)) return false;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Check if the file uses Card components without importing them
  const usesCardComponents = /\<Card|\<CardHeader|\<CardTitle|\<CardContent|\<CardFooter|\<CardDescription/g.test(content);
  const alreadyImportsCards = /import.*from\s+['"]@\/components\/ui\/Card['"]/g.test(content);
  
  if (usesCardComponents && !alreadyImportsCards) {
    // Determine which card components are used
    const cardComponents = [];
    if (content.includes('<Card')) cardComponents.push('Card');
    if (content.includes('<CardHeader')) cardComponents.push('CardHeader');
    if (content.includes('<CardTitle')) cardComponents.push('CardTitle');
    if (content.includes('<CardContent')) cardComponents.push('CardContent');
    if (content.includes('<CardFooter')) cardComponents.push('CardFooter');
    if (content.includes('<CardDescription')) cardComponents.push('CardDescription');
    
    if (cardComponents.length > 0) {
      // Find a good place to insert the import, after other UI component imports
      const lines = content.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^import.*from\s+['"]/)) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex >= 0) {
        const newImport = `import { ${cardComponents.join(', ')} } from '@/components/ui/Card';`;
        lines.splice(lastImportIndex + 1, 0, newImport);
        const updatedContent = lines.join('\n');
        
        fs.writeFileSync(filePath, updatedContent);
        console.log(`✅ Added Card imports to ${path.relative(ROOT_DIR, filePath)}`);
        return true;
      }
    }
  }
  
  return false;
};

// Fix missing Lucide icon imports
const fixMissingIconImports = (filePath) => {
  if (!fs.existsSync(filePath)) return false;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Check for icons used but not imported
  const iconPatterns = {
    'Check': /\<Check[ \/>]/,
    'Save': /\<Save[ \/>]/,
    'Phone': /\<Phone[ \/>]/,
    'User': /\<User[ \/>]/,
    'Users': /\<Users[ \/>]/
  };
  
  // Get all current Lucide imports
  const lucideImportMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/);
  let existingIcons = [];
  
  if (lucideImportMatch && lucideImportMatch[1]) {
    existingIcons = lucideImportMatch[1].split(',').map(icon => icon.trim());
  }
  
  // Find missing icons that need to be imported
  const missingIcons = [];
  for (const [icon, pattern] of Object.entries(iconPatterns)) {
    if (pattern.test(content) && !existingIcons.includes(icon) && !content.includes(`import { ${icon} `)) {
      missingIcons.push(icon);
    }
  }
  
  if (missingIcons.length > 0) {
    const lines = content.split('\n');
    
    // Find the lucide-react import line
    let lucideImportLine = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('from \'lucide-react\'')) {
        lucideImportLine = i;
        break;
      }
    }
    
    if (lucideImportLine >= 0) {
      // Add missing icons to existing import
      lines[lucideImportLine] = lines[lucideImportLine].replace(
        /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/,
        (match, imports) => {
          const allIcons = [...existingIcons, ...missingIcons].join(', ');
          return `import { ${allIcons} } from 'lucide-react'`;
        }
      );
    } else {
      // Add new import if none exists
      let lastImportIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^import.*from\s+['"]/)) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex >= 0) {
        lines.splice(lastImportIndex + 1, 0, `import { ${missingIcons.join(', ')} } from 'lucide-react';`);
      }
    }
    
    const updatedContent = lines.join('\n');
    fs.writeFileSync(filePath, updatedContent);
    console.log(`✅ Added icon imports to ${path.relative(ROOT_DIR, filePath)}`);
    return true;
  }
  
  return false;
};

// Find files in dashboard directory
const dashboardFiles = glob.sync(`${DASHBOARD_DIR}/**/*.{ts,tsx}`);

// Process each file
let fixedCount = 0;

dashboardFiles.forEach(file => {
  if (processFile(file)) {
    fixedCount++;
  }
  if (fixMissingIconImports(file)) {
    fixedCount++;
  }
});

console.log(`\n🎉 Fixed imports in ${fixedCount} files`);
