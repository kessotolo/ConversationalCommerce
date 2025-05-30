const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

async function fixFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  
  // Remove duplicate React imports and add the correct one
  const lines = content.split('\n');
  const newLines = lines.filter(line => 
    !line.match(/^import React/) &&
    !line.match(/^import \{ React \}/) &&
    !line.match(/^import \{ Error \} from 'react'/) &&
    !line.match(/^import \{ Record \} from 'react'/)
  );
  
  // Add proper React import at the top
  newLines.unshift("import * as React from 'react';");
  
  // Write back to file
  await writeFile(filePath, newLines.join('\n'));
}

async function findFiles(dir) {
  const files = await readdir(dir);
  const promises = files.map(async file => {
    const filePath = path.join(dir, file);
    const stats = await stat(filePath);
    
    if (stats.isDirectory()) {
      return findFiles(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      return fixFile(filePath);
    }
  });
  
  await Promise.all(promises);
}

// Start fixing files
findFiles(path.join(process.cwd(), 'src'))
  .then(() => console.log('TypeScript fixes applied'))
  .catch(console.error);
