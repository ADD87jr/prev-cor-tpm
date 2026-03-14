require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function fixSvgExtensions() {
  console.log('=== Corectare extensii SVG → .svg ===\n');
  
  const siemensDir = 'public/products/siemens';
  const files = fs.readdirSync(siemensDir);
  
  let fixed = 0;
  
  for (const file of files) {
    if (!file.endsWith('.jpg')) continue;
    
    const filePath = path.join(siemensDir, file);
    const bytes = fs.readFileSync(filePath).slice(0, 4);
    
    // Verifică dacă e SVG (începe cu '<svg')
    if (bytes[0] === 60 && bytes[1] === 115 && bytes[2] === 118 && bytes[3] === 103) {
      const newFile = file.replace('.jpg', '.svg');
      const newPath = path.join(siemensDir, newFile);
      
      // Redenumește fișierul
      fs.renameSync(filePath, newPath);
      console.log(`📁 Redenumit: ${file} → ${newFile}`);
      
      // Actualizează în baza de date
      const oldImage = `/products/siemens/${file}`;
      const newImage = `/products/siemens/${newFile}`;
      
      const result = await db.execute({
        sql: 'UPDATE Product SET image = ? WHERE image = ?',
        args: [newImage, oldImage]
      });
      
      if (result.rowsAffected > 0) {
        console.log(`   ✅ DB actualizat (${result.rowsAffected} produs/e)`);
      }
      
      fixed++;
    }
  }
  
  console.log(`\n=== Total corectat: ${fixed} fișiere ===`);
}

fixSvgExtensions();
