const fs = require('fs');
const path = require('path');

const OLD_KEY = 'AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  });
}

let count = 0;
walkDir('src/app/admin/api', (filePath) => {
  if (filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(OLD_KEY)) {
      // Replace hardcoded key
      content = content.replace(
        new RegExp(`const GEMINI_API_KEY = "${OLD_KEY}";`, 'g'),
        'const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";'
      );
      // Replace with fallback
      content = content.replace(
        new RegExp(`const GEMINI_API_KEY = process\\.env\\.GEMINI_API_KEY \\|\\| "${OLD_KEY}";`, 'g'),
        'const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";'
      );
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Fixed:', filePath);
      count++;
    }
  }
});

// Also fix lib/ai-utils.ts
const aiUtilsPath = 'src/lib/ai-utils.ts';
if (fs.existsSync(aiUtilsPath)) {
  let content = fs.readFileSync(aiUtilsPath, 'utf8');
  if (content.includes(OLD_KEY)) {
    content = content.replace(
      new RegExp(`const GEMINI_API_KEY = process\\.env\\.GEMINI_API_KEY \\|\\| "${OLD_KEY}";`, 'g'),
      'const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";'
    );
    fs.writeFileSync(aiUtilsPath, content, 'utf8');
    console.log('Fixed:', aiUtilsPath);
    count++;
  }
}

console.log(`\nTotal files fixed: ${count}`);
