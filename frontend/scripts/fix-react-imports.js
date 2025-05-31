/**
 * React Import Fixer
 * 
 * This script fixes common React import issues:
 * 1. Duplicate React imports
 * 2. Incorrect component imports
 * 3. Conflicts with barrel imports
 * 
 * Part of the ConversationalCommerce platform performance optimization
 * for African markets with limited connectivity.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files to scan and fix
const filePaths = glob.sync([
  './src/**/*.{ts,tsx,js,jsx}',
  './pages/**/*.{ts,tsx,js,jsx}',
  './app/**/*.{ts,tsx,js,jsx}'
], { ignore: ['**/node_modules/**'] });

console.log('🚀 Running React import fixer...');

// Count of fixed files
let fixedFiles = 0;

// Process each file
filePaths.forEach((filePath, index) => {
  if (index % 20 === 0) {
    console.log(`Processed ${index}/${filePaths.length} files...`);
  }
  
  // Read file content
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Fix duplicate React imports
  const reactImportRegex = /import\s+(?:{\s*(?:React|FC|Component|useState|useEffect|Suspense|.*?)(?:\s*,\s*.*?)?\s*}|React\s*,?.*?)\s+from\s+['"]react['"];?/g;
  const reactImports = content.match(reactImportRegex) || [];
  
  if (reactImports.length > 1) {
    // Extract all the named imports
    const namedImports = new Set();
    reactImports.forEach(importStmt => {
      const matches = importStmt.match(/{\s*(.*?)\s*}/);
      if (matches && matches[1]) {
        matches[1].split(',').forEach(name => {
          const trimmedName = name.trim();
          if (trimmedName && trimmedName !== 'React') {
            namedImports.add(trimmedName);
          }
        });
      }
    });
    
    // Check if default React import is needed
    const needsDefaultImport = content.includes('React.') || 
                              content.includes('<React.') ||
                              content.match(/import\s+React\s+from/);
    
    // Create a single consolidated import
    let newImport = '';
    if (needsDefaultImport) {
      if (namedImports.size > 0) {
        newImport = `import React, { ${Array.from(namedImports).join(', ')} } from 'react';`;
      } else {
        newImport = `import React from 'react';`;
      }
    } else if (namedImports.size > 0) {
      newImport = `import { ${Array.from(namedImports).join(', ')} } from 'react';`;
    }
    
    // Replace all React imports with the consolidated import
    content = content.replace(reactImportRegex, '');
    
    // Add the new import after any runtime imports
    if (newImport) {
      const runtimeImport = content.match(/import\s+{.*?}\s+from\s+['"]react\/jsx-runtime['"];?/);
      if (runtimeImport) {
        content = content.replace(runtimeImport[0], `${runtimeImport[0]}\n${newImport}`);
      } else {
        // Add to the top of the file
        content = newImport + '\n' + content;
      }
    }
  }
  
  // Fix duplicate identifier declarations
  const duplicateIdentifiers = [
    { regex: /ThemeProvider as CustomThemeProvider.*?\n.*?ThemeProvider as CustomThemeProvider/s, fix: (match) => match.split('\n')[0] },
    { regex: /Package.*?ShoppingBag.*?\n.*?Package.*?ShoppingBag/s, fix: (match) => {
      // Keep only one barrel import for lucide-react icons
      const lines = match.split('\n');
      return lines[0].includes('__barrel_optimize__') ? lines[0] : lines[1]; 
    }}
  ];
  
  duplicateIdentifiers.forEach(({ regex, fix }) => {
    const match = content.match(regex);
    if (match) {
      content = content.replace(match[0], fix(match[0]));
    }
  });
  
  // Fix Server Component using Class Component
  if (filePath.includes('/app/') && filePath.match(/page\.(js|tsx?)$/)) {
    // If it's importing Component from react, replace with function components
    if (content.includes("import { Component } from 'react'")) {
      content = content.replace("import { Component } from 'react'", "import { Suspense } from 'react'");
      
      // Check for class component definitions
      const classComponentRegex = /class\s+(\w+)\s+extends\s+Component/g;
      const classComponents = content.match(classComponentRegex);
      
      if (classComponents) {
        // Convert to functional components
        classComponents.forEach(classComp => {
          const compName = classComp.match(/class\s+(\w+)/)[1];
          
          // Simple conversion - this is basic and might need manual tweaking
          const renderMethodRegex = new RegExp(`render\\(\\)\\s*{([\\s\\S]*?)return\\s+([\\s\\S]*?);?\\s*}`, 'g');
          const renderMatch = renderMethodRegex.exec(content);
          
          if (renderMatch) {
            const functionComp = `function ${compName}(props) {${renderMatch[1]}return ${renderMatch[2]};\n}`;
            content = content.replace(/class\s+(\w+)\s+extends\s+Component[\s\S]*?}/, functionComp);
          }
        });
      }
    }
  }
  
  // Write changes if content was modified
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed imports in ${filePath}`);
    fixedFiles++;
  }
});

console.log(`\n✅ Fixed ${fixedFiles} files with React import issues`);
console.log('✨ All done! React import issues have been fixed.');
