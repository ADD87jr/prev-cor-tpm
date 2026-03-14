/**
 * Descarcare imagini direct de pe SiePortal (site oficial Siemens)
 * URL format: https://sieportal.siemens.com/en-ww/products-services/detail/BPZ:SKU
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const OUTPUT_DIR = 'public/products/siemens';

// Asigură că directorul există
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    https.get(url, options, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      const file = fs.createWriteStream(filepath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== Descărcare imagini de pe SiePortal (oficial Siemens) ===\n');
  
  // Obține lista de produse Siemens care au nevoie de imagini
  const result = await db.execute(`
    SELECT id, sku, name, image 
    FROM Product 
    WHERE manufacturer = 'Siemens'
    ORDER BY sku
  `);
  
  console.log(`Găsite ${result.rows.length} produse Siemens\n`);
  
  // Filtrează produsele care necesită imagini noi
  const productsNeedingImages = result.rows.filter(p => {
    if (!p.image) return true;
    const imagePath = path.join('public', p.image);
    if (!fs.existsSync(imagePath)) return true;
    
    // Verifică dacă e SVG sau prea mic
    try {
      const bytes = fs.readFileSync(imagePath).slice(0, 4);
      if (bytes[0] === 60 && bytes[1] === 115) return true; // SVG
      
      const stats = fs.statSync(imagePath);
      if (stats.size < 3000) return true; // prea mic
    } catch {
      return true;
    }
    return false;
  });
  
  console.log(`${productsNeedingImages.length} produse necesită imagini noi\n`);
  
  if (productsNeedingImages.length === 0) {
    console.log('Toate produsele au imagini valide!');
    return;
  }
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  let downloaded = 0;
  let failed = 0;
  
  for (const product of productsNeedingImages) {
    const sku = product.sku;
    console.log(`\n🔍 ${sku} - ${product.name.substring(0, 50)}...`);
    
    try {
      // URL SiePortal - folosește BPZ: prefix
      const sieportalUrl = `https://sieportal.siemens.com/en-ww/products-services/detail/BPZ:${encodeURIComponent(sku)}`;
      
      await page.goto(sieportalUrl, { timeout: 30000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Așteaptă încărcarea imaginilor
      
      // Caută imaginea produsului
      const imgSelectors = [
        '.product-image img',
        '.detail-image img',
        '.gallery-image img',
        '[data-testid="product-image"] img',
        '.image-container img',
        'img[alt*="product"]',
        '.slick-slide img',
        '.carousel img',
        'img.product',
        'figure img'
      ];
      
      let imgUrl = null;
      
      for (const selector of imgSelectors) {
        try {
          const img = await page.$(selector);
          if (img) {
            const src = await img.getAttribute('src');
            if (src && src.includes('http') && !src.includes('placeholder') && !src.includes('icon')) {
              imgUrl = src;
              break;
            }
          }
        } catch {}
      }
      
      // Dacă nu găsește cu selectori, încearcă să ia prima imagine mare
      if (!imgUrl) {
        const allImages = await page.$$('img');
        for (const img of allImages) {
          try {
            const src = await img.getAttribute('src');
            const width = await img.getAttribute('width');
            const naturalWidth = await img.evaluate(el => el.naturalWidth);
            
            if (src && src.includes('http') && !src.includes('icon') && !src.includes('logo') && naturalWidth > 100) {
              imgUrl = src;
              break;
            }
          } catch {}
        }
      }
      
      if (imgUrl) {
        // Descarcă imaginea
        const ext = imgUrl.includes('.png') ? '.png' : '.jpg';
        const filename = sku.replace(/\./g, '_').replace(/\s/g, '').replace(/-/g, '_') + ext;
        const filepath = path.join(OUTPUT_DIR, filename);
        
        try {
          await downloadImage(imgUrl, filepath);
          
          const stats = fs.statSync(filepath);
          if (stats.size > 2000) {
            // Verifică dacă nu e SVG
            const bytes = fs.readFileSync(filepath).slice(0, 4);
            if (bytes[0] !== 60) { // nu e XML/SVG
              const newImagePath = `/products/siemens/${filename}`;
              await db.execute({
                sql: 'UPDATE Product SET image = ? WHERE id = ?',
                args: [newImagePath, product.id]
              });
              
              console.log(`   ✅ Descărcat (${Math.round(stats.size/1024)}KB)`);
              downloaded++;
            } else {
              fs.unlinkSync(filepath);
              console.log(`   ⚠️ SVG, șters`);
              failed++;
            }
          } else {
            fs.unlinkSync(filepath);
            console.log(`   ⚠️ Prea mic, șters`);
            failed++;
          }
        } catch (err) {
          console.log(`   ❌ Eroare descărcare: ${err.message}`);
          failed++;
        }
      } else {
        console.log(`   ⏭️ Imagine negăsită în pagină`);
        failed++;
      }
      
    } catch (err) {
      console.log(`   ❌ Eroare: ${err.message}`);
      failed++;
    }
    
    // Pauză între requests
    await page.waitForTimeout(1500);
  }
  
  await browser.close();
  
  console.log('\n=== REZUMAT ===');
  console.log(`✅ Descărcate: ${downloaded}`);
  console.log(`❌ Negăsite: ${failed}`);
}

main().catch(console.error);
