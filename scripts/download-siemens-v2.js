/**
 * Download individual Siemens images from SiePortal
 * Extrage imaginea din meta tags sau din pagina produsului
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const SIEMENS_DIR = 'public/products/siemens';

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const makeRequest = (currentUrl) => {
      https.get(currentUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const newUrl = res.headers.location.startsWith('http') 
            ? res.headers.location 
            : new URL(res.headers.location, currentUrl).href;
          makeRequest(newUrl);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    makeRequest(url);
  });
}

async function main() {
  console.log('=== Descărcare imagini individuale Siemens ===\n');
  
  const result = await db.execute(`
    SELECT id, sku, name, image FROM Product 
    WHERE manufacturer = 'Siemens'
    ORDER BY sku
  `);
  
  console.log(`Total: ${result.rows.length} produse\n`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  let success = 0, failed = 0, skipped = 0;
  
  for (let i = 0; i < result.rows.length; i++) {
    const product = result.rows[i];
    const sku = product.sku;
    
    // Verifică dacă are deja imagine individuală (nu placeholder)
    if (product.image && !product.image.includes('P_BT01') && !product.image.includes('.svg')) {
      // Verifică dacă fișierul există și e valid
      const imgPath = path.join('public', product.image);
      if (fs.existsSync(imgPath)) {
        const stats = fs.statSync(imgPath);
        if (stats.size > 3000) {
          console.log(`[${i+1}/${result.rows.length}] ${sku}: ⏭️ există deja`);
          skipped++;
          continue;
        }
      }
    }
    
    console.log(`[${i+1}/${result.rows.length}] ${sku}: accesez SiePortal...`);
    
    const page = await context.newPage();
    
    try {
      const url = `https://sieportal.siemens.com/en-ww/products-services/detail/BPZ:${sku}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      
      // Încearcă să găsești imaginea din og:image sau din pagină
      let imageUrl = null;
      
      // Metoda 1: og:image meta tag
      try {
        imageUrl = await page.$eval('meta[property="og:image"]', el => el.content);
      } catch (e) {}
      
      // Metoda 2: Caută imaginea principală
      if (!imageUrl) {
        const images = await page.$$eval('img', imgs => 
          imgs.map(img => ({
            src: img.src,
            alt: img.alt || '',
            width: img.naturalWidth || img.width || 0
          }))
        );
        
        // Sortează după dimensiune și caută una relevantă
        const productImages = images.filter(img => 
          img.src && 
          img.src.includes('http') &&
          img.width > 100 &&
          !img.src.includes('logo') &&
          !img.src.includes('icon') &&
          !img.src.includes('placeholder') &&
          !img.src.includes('.svg')
        ).sort((a, b) => b.width - a.width);
        
        if (productImages.length > 0) {
          imageUrl = productImages[0].src;
        }
      }
      
      if (imageUrl && !imageUrl.includes('.svg')) {
        // Descarcă imaginea
        const buffer = await downloadFile(imageUrl);
        
        if (buffer.length > 2000) {
          // Verifică tipul
          let ext = '.jpg';
          if (buffer[0] === 0x89 && buffer[1] === 0x50) ext = '.png';
          
          const filename = `${sku.replace(/\./g, '_')}${ext}`;
          const filepath = path.join(SIEMENS_DIR, filename);
          
          fs.writeFileSync(filepath, buffer);
          
          // Actualizează DB
          await db.execute({
            sql: 'UPDATE Product SET image = ? WHERE id = ?',
            args: [`/products/siemens/${filename}`, product.id]
          });
          
          console.log(`   ✅ salvat ${filename} (${Math.round(buffer.length/1024)}KB)`);
          success++;
        } else {
          console.log(`   ⚠️ imagine prea mică`);
          failed++;
        }
      } else {
        console.log(`   ❌ nu s-a găsit imagine`);
        failed++;
      }
      
    } catch (err) {
      console.log(`   ❌ eroare: ${err.message}`);
      failed++;
    }
    
    await page.close();
    await new Promise(r => setTimeout(r, 1500));
  }
  
  await browser.close();
  
  console.log(`\n=== REZUMAT ===`);
  console.log(`Descărcate: ${success}`);
  console.log(`Sărite: ${skipped}`);
  console.log(`Eșuate: ${failed}`);
}

main().catch(console.error);
