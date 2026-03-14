require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Directorul pentru imagini
const imagesDir = path.join(__dirname, '..', 'public', 'products', 'siemens');

// Funcție pentru a descărca o imagine
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('image')) {
        reject(new Error('Not an image'));
        return;
      }
      
      const file = fs.createWriteStream(filepath);
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
      
      file.on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    });
    
    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// URL-uri posibile pentru imagini Siemens
function getSiemensImageUrls(sku) {
  const cleanSku = sku.replace(/[/-]/g, '');
  return [
    // Siemens mall.industry.siemens.com
    `https://mall.industry.siemens.com/goos/WelssIndex/image/${sku}`,
    `https://mall.industry.siemens.com/mall/images/product/${cleanSku}.jpg`,
    // Asset-uri Siemens
    `https://assets.new.siemens.com/siemens/assets/api/uuid:${sku.toLowerCase()}/image`,
    // Support Siemens
    `https://support.industry.siemens.com/cs/images/product/${sku}.jpg`,
    // Google Images placeholder (generăm una simplă)
  ];
}

async function downloadSyncoImages() {
  console.log('=== Descărcare imagini produse SYNCO ===\n');
  
  // Asigură-te că directorul există
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  const result = await db.execute(`
    SELECT id, sku, name, image 
    FROM Product 
    WHERE sku LIKE 'RLU%' OR sku LIKE 'RMU%' OR sku LIKE 'RMK%' OR 
          sku LIKE 'RMB%' OR sku LIKE 'RMS%' OR sku LIKE 'RMZ%' OR 
          sku LIKE 'RMH%' OR sku LIKE 'SEZ%' OR sku LIKE 'SEA%' OR 
          sku LIKE 'SEM%' OR sku LIKE 'ARG%' OR sku LIKE 'BAU%' OR 
          sku LIKE 'EM1%' OR sku LIKE 'RLE%'
    ORDER BY sku
  `);
  
  console.log(`Găsite ${result.rows.length} produse SYNCO\n`);
  
  let downloaded = 0;
  let failed = 0;
  
  for (const product of result.rows) {
    const imageName = product.sku.replace(/[./-]/g, '_');
    const localPath = path.join(imagesDir, `${imageName}.jpg`);
    const dbPath = `/products/siemens/${imageName}.jpg`;
    
    // Verifică dacă imaginea există deja
    if (fs.existsSync(localPath)) {
      console.log(`✓ ${product.sku} - imagine existentă`);
      
      // Actualizează calea în DB
      if (product.image !== dbPath) {
        await db.execute({
          sql: 'UPDATE Product SET image = ? WHERE id = ?',
          args: [dbPath, product.id]
        });
      }
      downloaded++;
      continue;
    }
    
    // Încearcă să descarce imaginea
    const urls = getSiemensImageUrls(product.sku);
    let success = false;
    
    for (const url of urls) {
      try {
        await downloadImage(url, localPath);
        console.log(`✅ ${product.sku} - descărcată de la ${url.substring(0, 50)}...`);
        
        // Actualizează calea în DB
        await db.execute({
          sql: 'UPDATE Product SET image = ? WHERE id = ?',
          args: [dbPath, product.id]
        });
        
        downloaded++;
        success = true;
        break;
      } catch (err) {
        // Încearcă următorul URL
      }
    }
    
    if (!success) {
      console.log(`⚠ ${product.sku} - nu s-a găsit imagine (rămâne placeholder)`);
      failed++;
    }
    
    // Pauză pentru a nu supraîncărca serverul
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\n=== REZUMAT ===`);
  console.log(`Descărcate/existente: ${downloaded}`);
  console.log(`Fără imagine (placeholder): ${failed}`);
}

async function main() {
  try {
    await downloadSyncoImages();
    console.log('\n✅ Operațiune completată!');
  } catch (error) {
    console.error('Eroare:', error);
  } finally {
    process.exit(0);
  }
}

main();
