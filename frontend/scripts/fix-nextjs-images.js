#!/usr/bin/env node

/**
 * fix-nextjs-images.js
 * 
 * A script to fix Next.js image optimization issues in the codebase.
 * Replaces HTML <img> tags with Next.js <Image> components for better performance,
 * lazy loading, and automatic responsive image handling.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SOURCE_DIR = path.resolve(__dirname, '../src');
const FIXED_COUNT = {
  images: 0
};

// Patterns to replace HTML img tags with Next.js Image components
const IMAGE_PATTERNS = [
  // Basic img tag with src and alt
  {
    pattern: /<img\s+src=["'](.*?)["']\s+alt=["'](.*?)["']\s*\/?>/g,
    replacement: '<Image src="$1" alt="$2" width={500} height={300} />'
  },
  // img tag with src, alt, and additional attributes
  {
    pattern: /<img\s+src=["'](.*?)["']\s+alt=["'](.*?)["'](.*?)\/?>/g,
    replacement: (match, src, alt, rest) => {
      // Extract width and height if they exist in the attributes
      const widthMatch = rest.match(/width=["']?(\d+)["']?/);
      const heightMatch = rest.match(/height=["']?(\d+)["']?/);
      
      const width = widthMatch ? widthMatch[1] : 500;
      const height = heightMatch ? heightMatch[1] : 300;
      
      // Remove width and height from rest attributes as they'll be handled differently
      let cleanRest = rest
        .replace(/width=["']?\d+["']?/, '')
        .replace(/height=["']?\d+["']?/, '')
        .trim();
      
      return `<Image src="${src}" alt="${alt}" width={${width}} height={${height}} ${cleanRest} />`;
    }
  },
  // img with className first
  {
    pattern: /<img\s+className=["'](.*?)["']\s+src=["'](.*?)["']\s+alt=["'](.*?)["'](.*?)\/?>/g,
    replacement: (match, className, src, alt, rest) => {
      const widthMatch = rest.match(/width=["']?(\d+)["']?/);
      const heightMatch = rest.match(/height=["']?(\d+)["']?/);
      
      const width = widthMatch ? widthMatch[1] : 500;
      const height = heightMatch ? heightMatch[1] : 300;
      
      let cleanRest = rest
        .replace(/width=["']?\d+["']?/, '')
        .replace(/height=["']?\d+["']?/, '')
        .trim();
        
      return `<Image className="${className}" src="${src}" alt="${alt}" width={${width}} height={${height}} ${cleanRest} />`;
    }
  },
  // Logo image common pattern
  {
    pattern: /<img\s+.*?src=["'](.*?logo.*?)["'].*?\/?>/gi,
    replacement: (match, src) => {
      // Extract any className if present
      const classMatch = match.match(/className=["'](.*?)["']/);
      const className = classMatch ? ` className="${classMatch[1]}"` : '';
      
      // Use smaller dimensions for logos
      return `<Image${className} src="${src}" alt="Logo" width={150} height={50} />`;
    }
  },
  // Avatar/profile image common pattern
  {
    pattern: /<img\s+.*?src=["'](.*?avatar.*?|.*?profile.*?|.*?user.*?)["'].*?\/?>/gi,
    replacement: (match, src) => {
      // Extract any className if present
      const classMatch = match.match(/className=["'](.*?)["']/);
      const className = classMatch ? ` className="${classMatch[1]}"` : '';
      
      // Use square dimensions for avatars
      return `<Image${className} src="${src}" alt="User Avatar" width={40} height={40} />`;
    }
  }
];

/**
 * Adds import statement for Next.js Image component if not present
 */
function addImageImport(content) {
  // Only add import if there's an Image component and no import
  if (content.includes('<Image') && !content.includes("import Image from 'next/image'")) {
    return "import Image from 'next/image';\n\n" + content;
  }
  return content;
}

/**
 * Fixes image tags in a single file
 */
function fixImagesInFile(filePath) {
  let fileContent = fs.readFileSync(filePath, 'utf8');
  let wasModified = false;
  
  // Apply image replacements
  IMAGE_PATTERNS.forEach(({ pattern, replacement }) => {
    const originalContent = fileContent;
    
    if (typeof replacement === 'function') {
      fileContent = fileContent.replace(pattern, replacement);
    } else {
      fileContent = fileContent.replace(pattern, replacement);
    }
    
    if (originalContent !== fileContent) {
      wasModified = true;
      FIXED_COUNT.images++;
    }
  });
  
  // Add Next.js Image import if needed
  const contentWithImport = addImageImport(fileContent);
  if (contentWithImport !== fileContent) {
    fileContent = contentWithImport;
    wasModified = true;
  }
  
  if (wasModified) {
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`✅ Fixed images in ${filePath.replace(process.cwd(), '')}`);
  }
}

/**
 * Process all React files in the project
 */
function processAllFiles() {
  // Find React component files
  const files = glob.sync(path.join(SOURCE_DIR, '**/*.{tsx,jsx}'));
  
  console.log(`🔍 Found ${files.length} React files to process`);
  
  // Process each file
  files.forEach(file => {
    try {
      fixImagesInFile(file);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  });
  
  console.log('\n===== SUMMARY =====');
  console.log(`✅ Fixed ${FIXED_COUNT.images} image optimizations`);
  console.log('===================\n');
}

// Main execution
console.log('🛠️ Starting fix of Next.js image optimizations...');
processAllFiles();
console.log('✅ Completed fixing Next.js image optimizations!');
