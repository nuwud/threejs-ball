/**
 * Path checker utility for finding incorrect import paths
 * 
 * Run with: node tools/path-checker.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

// Define old path patterns that need to be updated
const pathMappings = [
  { 
    oldPattern: /from ['"]\.\.\/audio\.js['"]/g, 
    newPath: 'from \'../audio/index.js\'',
    description: 'Main audio import'
  },
  { 
    oldPattern: /from ['"]\.\.\/sound-manager\.js['"]/g, 
    newPath: 'from \'./sound-manager.js\' or \'../playback/sound-manager.js\'',
    description: 'Sound manager import'
  },
  { 
    oldPattern: /from ['"]\.\.\/utils\.js['"]/g, 
    newPath: 'from \'../utils/common.js\'',
    description: 'Utils import'
  },
  { 
    oldPattern: /from ['"]\.\.\/synthesizer\.js['"]/g, 
    newPath: 'from \'../synthesis/synthesizer.js\'',
    description: 'Synthesizer import'
  },
  // Add more patterns as needed
];

// Find all JavaScript files in a directory recursively
function findJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findJsFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Check a file for problematic import paths
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  pathMappings.forEach(mapping => {
    if (mapping.oldPattern.test(content)) {
      issues.push({
        file: path.relative(projectRoot, filePath),
        description: mapping.description,
        suggestion: mapping.newPath
      });
    }
  });
  
  return issues;
}

// Main function
function main() {
  console.log('Scanning for problematic import paths...');
  
  const jsFiles = findJsFiles(srcDir);
  let totalIssues = 0;
  
  jsFiles.forEach(file => {
    const fileIssues = checkFile(file);
    
    if (fileIssues.length > 0) {
      console.log(`\nIssues in ${path.relative(projectRoot, file)}:`);
      fileIssues.forEach(issue => {
        console.log(`  - ${issue.description}: Update to ${issue.suggestion}`);
        totalIssues++;
      });
    }
  });
  
  if (totalIssues === 0) {
    console.log('No path issues found!');
  } else {
    console.log(`\nFound ${totalIssues} potential path issues that need fixing.`);
  }
}

main();
