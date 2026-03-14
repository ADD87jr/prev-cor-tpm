/**
 * Script pentru descărcarea imaginilor Siemens de pe site-uri distribuitori
 * Site-uri: distribuitorsiemens.ro, electrospeed.ro, elconet.ro
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

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
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', reject);
  });
}

async function searchDistribuitorSiemens(page, sku) {
  try {
    // Încearcă URL direct cu SKU
    const skuLower = sku.toLowerCase().replace(/\./g, '-');
    const url = `https://distribuitorsiemens.ro/?s=${encodeURIComponent(sku)}&post_type=product`;
    
    await page.goto(url, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    
    // Caută linkul produsului în rezultate
    const productLink = await page.$('a.woocommerce-LoopProduct-link');
    if (productLink) {
      const href = await productLink.getAttribute('href');
      await page.goto(href, { timeout: 30000 });
      await page.waitForLoadState('domcontentloaded');
      
      // Găsește imaginea produsului
      const imgEl = await page.$('.woocommerce-product-gallery__image img, .wp-post-image');
      if (imgEl) {
        let imgSrc = await imgEl.getAttribute('data-src') || await imgEl.getAttribute('src');
        if (imgSrc && !imgSrc.includes('placeholder') && !imgSrc.includes('woocommerce-placeholder')) {
          return imgSrc;
        }
      }
    }
  } catch (e) {
    // Silently fail
  }
  return null;
}

async function searchElconet(page, sku) {
  try {
    const url = `https://www.elconet.ro/cautare?search=${encodeURIComponent(sku)}`;
    
    await page.goto(url, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    
    // Caută linkul produsului
    const productLink = await page.$('.product-layout a.product-image, .product-thumb a');
    if (productLink) {
      const href = await productLink.getAttribute('href');
      await page.goto(href, { timeout: 30000 });
      await page.waitForLoadState('domcontentloaded');
      
      // Găsește imaginea
      const imgEl = await page.$('.product-image img, #image, .main-image img');
      if (imgEl) {
        let imgSrc = await imgEl.getAttribute('src') || await imgEl.getAttribute('data-src');
        if (imgSrc && !imgSrc.includes('placeholder') && !imgSrc.includes('no_image')) {
          if (!imgSrc.startsWith('http')) {
            imgSrc = 'https://www.elconet.ro' + imgSrc;
          }
          return imgSrc;
        }
      }
    }
  } catch (e) {
    // Silently fail
  }
  return null;
}

async function searchElectrospeed(page, sku) {
  try {
    const url = `https://electrospeed.ro/?s=${encodeURIComponent(sku)}&post_type=product`;
    
    await page.goto(url, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    
    // Caută linkul produsului
    const productLink = await page.$('.product a.woocommerce-LoopProduct-link, .products a');
    if (productLink) {
      const href = await productLink.getAttribute('href');
      await page.goto(href, { timeout: 30000 });
      await page.waitForLoadState('domcontentloaded');
      
      // Găsește imaginea
      const imgEl = await page.$('.woocommerce-product-gallery__image img, .wp-post-image');
      if (imgEl) {
        let imgSrc = await imgEl.getAttribute('data-src') || await imgEl.getAttribute('src');
        if (imgSrc && !imgSrc.includes('placeholder') && !imgSrc.includes('woocommerce-placeholder')) {
          return imgSrc;
        }
      }
    }
  } catch (e) {
    // Silently fail
  }
  return null;
}

async function main() {
  console.log('=== Descărcare imagini Siemens de pe distribuitori ===\n');
  
  // Obține lista de produse Siemens
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
    // Verifică dacă imaginea este SVG (placeholder) sau nu există
    const imagePath = path.join('public', p.image);
    if (!fs.existsSync(imagePath)) return true;
    const bytes = fs.readFileSync(imagePath).slice(0, 4);
    // SVG starts with '<svg' (60 115 118 103)
    if (bytes[0] === 60 && bytes[1] === 115) return true;
    // Verifică dacă e prea mic (< 5KB probabil placeholder)
    const stats = fs.statSync(imagePath);
    if (stats.size < 5000) return true;
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
    console.log(`\n🔍 Căutare: ${sku} - ${product.name.substring(0, 40)}...`);
    
    let imgUrl = null;
    let source = '';
    
    // Încearcă distribuitorsiemens.ro
    imgUrl = await searchDistribuitorSiemens(page, sku);
    if (imgUrl) {
      source = 'distribuitorsiemens.ro';
    }
    
    // Dacă nu găsește, încearcă elconet
    if (!imgUrl) {
      imgUrl = await searchElconet(page, sku);
      if (imgUrl) source = 'elconet.ro';
    }
    
    // Dacă tot nu găsește, încearcă electrospeed
    if (!imgUrl) {
      imgUrl = await searchElectrospeed(page, sku);
      if (imgUrl) source = 'electrospeed.ro';
    }
    
    if (imgUrl) {
      // Descarcă imaginea
      const ext = imgUrl.includes('.png') ? '.png' : '.jpg';
      const filename = sku.replace(/\./g, '_').replace(/\s/g, '') + ext;
      const filepath = path.join(OUTPUT_DIR, filename);
      
      try {
        await downloadImage(imgUrl, filepath);
        
        // Verifică dimensiunea fișierului
        const stats = fs.statSync(filepath);
        if (stats.size > 1000) {
          // Actualizează în DB
          const newImagePath = `/products/siemens/${filename}`;
          await db.execute({
            sql: 'UPDATE Product SET image = ? WHERE id = ?',
            args: [newImagePath, product.id]
          });
          
          console.log(`   ✅ Descărcat de pe ${source} (${Math.round(stats.size/1024)}KB)`);
          downloaded++;
        } else {
          fs.unlinkSync(filepath);
          console.log(`   ⚠️ Imagine prea mică, șters`);
          failed++;
        }
      } catch (err) {
        console.log(`   ❌ Eroare descărcare: ${err.message}`);
        failed++;
      }
    } else {
      console.log(`   ⏭️ Nu s-a găsit pe niciun site`);
      failed++;
    }
    
    // Pauză pentru a nu supraîncărca serverele
    await new Promise(r => setTimeout(r, 2000));
  }
  
  await browser.close();
  
  console.log('\n=== REZUMAT ===');
  console.log(`✅ Descărcate: ${downloaded}`);
  console.log(`❌ Negăsite: ${failed}`);
}

main().catch(console.error);
