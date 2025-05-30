const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const rename = promisify(fs.rename);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

function toPascalCase(str) {
  return str
    .split(/[-_.]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

async function updateImports(filePath, oldPath, newPath) {
  const content = await readFile(filePath, 'utf8');
  const oldImportPath = oldPath.replace(/\\/g, '/').replace(/\.tsx?$/, '');
  const newImportPath = newPath.replace(/\\/g, '/').replace(/\.tsx?$/, '');
  const updatedContent = content.replace(
    new RegExp(oldImportPath, 'g'),
    newImportPath
  );
  await writeFile(filePath, updatedContent);
}

async function processDirectory(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await processDirectory(fullPath);
      continue;
    }
    
    if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      const dirName = path.dirname(entry.name);
      const baseName = path.basename(entry.name, path.extname(entry.name));
      const pascalName = toPascalCase(baseName);
      
      if (baseName !== pascalName) {
        const newPath = path.join(dir, `${pascalName}${path.extname(entry.name)}`);
        console.log(`Renaming ${fullPath} to ${newPath}`);
        await rename(fullPath, newPath);
        
        // Update imports in all files
        const files = await readdir(dir, { recursive: true });
        for (const file of files) {
          if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            await updateImports(path.join(dir, file), fullPath, newPath);
          }
        }
      }
    }
  }
}

// Start from the src directory
processDirectory(path.join(process.cwd(), 'src'))
  .then(() => console.log('File casing fixes applied'))
  .catch(console.error);
