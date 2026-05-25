const fs = require('fs');
const path = require('path');

function removeJSComments(content) {
  let result = '';
  let i = 0;
  let inString = false;
  let stringChar = '';
  let inRegex = false;
  
  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (!inString && !inRegex && char === '/' && nextChar === '/') {
      let j = i + 2;
      while (j < content.length && content[j] !== '\n') {
        j++;
      }
      i = j;
      continue;
    }
    
    if (!inString && !inRegex && char === '/' && nextChar === '*') {
      let j = i + 2;
      while (j < content.length - 1) {
        if (content[j] === '*' && content[j + 1] === '/') {
          i = j + 2;
          break;
        }
        j++;
      }
      continue;
    }
    
    if (!inRegex && (char === '"' || char === "'" || char === '`')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar && content[i - 1] !== '\\') {
        inString = false;
        stringChar = '';
      }
    }
    
    result += char;
    i++;
  }
  
  return result;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const cleaned = removeJSComments(content);
    
    if (content !== cleaned) {
      fs.writeFileSync(filePath, cleaned, 'utf8');
      console.log(`✓ Cleaned: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function walkDirectory(dir, extensions) {
  let filesProcessed = 0;
  
  function walk(currentPath) {
    const files = fs.readdirSync(currentPath);
    
    for (const file of files) {
      const filePath = path.join(currentPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.git') {
          walk(filePath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(file);
        if (extensions.includes(ext)) {
          if (processFile(filePath)) {
            filesProcessed++;
          }
        }
      }
    }
  }
  
  walk(dir);
  return filesProcessed;
}

console.log('🧹 Removing comments from codebase...\n');

const extensions = ['.js', '.ejs'];
const filesProcessed = walkDirectory('.', extensions);

console.log(`\n✅ Done! Processed ${filesProcessed} files.`);
