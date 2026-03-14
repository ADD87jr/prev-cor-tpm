#!/usr/bin/env node
/**
 * Script Playwright pentru descărcarea imaginilor produselor Siemens
 * Extrage imaginile direct de pe SiePortal și Wikipedia
 */

require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const { createClient } = require('@libsql/client');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const PRODUCTS_DIR = path.join(__dirname, '..', 'public', 'products', 'siemens');

// Funcție pentru descărcarea unei imagini
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://sieportal.siemens.com/'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const newUrl = response.headers.location.startsWith('http') 
          ? response.headers.location 
          : new URL(response.headers.location, url).href;
        downloadImage(newUrl, filepath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('image')) {
        reject(new Error(`Not an image: ${contentType}`));
        return;
      }
      
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length < 1000) {
          reject(new Error('File too small'));
          return;
        }
        fs.writeFileSync(filepath, buffer);
        resolve(buffer.length);
      });
    });
    
    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function extractImageFromSiePortal(page, sku) {
  const url = `https://sieportal.siemens.com/en-ww/products-services/detail/${encodeURIComponent(sku)}`;
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Așteaptă imaginea produsului să se încarce
    await page.waitForSelector('img[alt*="Product image"], img[src*="collaterals"], img[src*="mall.industry"]', { timeout: 10000 }).catch(() => {});
    
    // Extrage URL-ul imaginii
    const imageUrl = await page.evaluate(() => {
      // Caută imaginea produsului în mai multe locuri
      const selectors = [
        'img[alt="Product image"]',
        'img[src*="mall.industry.siemens.com/mall/collaterals"]',
        'img[src*="P_BT"]',
        '.product-image img',
        '[data-testid="product-image"] img',
        'main img[src*="jpg"]'
      ];
      
      for (const selector of selectors) {
        const img = document.querySelector(selector);
        if (img && img.src && img.src.includes('http') && !img.src.includes('svg')) {
          return img.src;
        }
      }
      
      // Caută orice imagine cu dimensiuni mari
      const images = document.querySelectorAll('img');
      for (const img of images) {
        if (img.src && 
            img.src.includes('http') && 
            !img.src.includes('svg') &&
            !img.src.includes('logo') &&
            !img.src.includes('icon') &&
            (img.naturalWidth > 100 || img.width > 100)) {
          return img.src;
        }
      }
      
      return null;
    });
    
    return imageUrl;
  } catch (err) {
    console.log(`  Eroare SiePortal: ${err.message}`);
    return null;
  }
}

async function extractImageFromWikipedia(page, searchTerm) {
  // Încearcă să găsească o imagine Siemens pe Wikipedia
  const url = `https://en.wikipedia.org/wiki/Siemens_Building_Technologies`;
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    const imageUrl = await page.evaluate(() => {
      // Caută imagini relevante
      const images = document.querySelectorAll('.infobox img, .thumbimage, .mw-file-element');
      for (const img of images) {
        if (img.src && img.src.includes('upload.wikimedia.org') && !img.src.includes('svg')) {
          // Convertește thumbnail la imagine mare
          return img.src.replace(/\/thumb\//, '/').replace(/\/[0-9]+px-[^/]+$/, '');
        }
      }
      return null;
    });
    
    return imageUrl;
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('=== Descărcare imagini Siemens cu Playwright ===\n');
  
  // Creez directorul dacă nu există
  if (!fs.existsSync(PRODUCTS_DIR)) {
    fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
  }
  
  // Obțin toate produsele Siemens
  const result = await db.execute(`
    SELECT id, sku, name, image 
    FROM Product 
    WHERE manufacturer = 'Siemens'
    ORDER BY sku
  `);
  
  console.log(`Total produse Siemens: ${result.rows.length}\n`);
  
  // Lansez browser-ul
  console.log('Pornire browser...\n');
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  // Accept cookies dacă apar
  page.on('dialog', dialog => dialog.accept());
  
  let downloaded = 0;
  let failed = 0;
  let skipped = 0;
  const successUrls = new Map(); // Cachează URL-uri descărcate cu succes
  const failedProducts = [];
  
  for (let i = 0; i < result.rows.length; i++) {
    const product = result.rows[i];
    const sku = product.sku;
    const safeSku = sku.replace(/[^a-zA-Z0-9-]/g, '_');
    const imagePath = path.join(PRODUCTS_DIR, `${safeSku}.jpg`);
    const relativeImagePath = `/products/siemens/${safeSku}.jpg`;
    
    // Skip dacă imaginea există deja și e mare
    if (fs.existsSync(imagePath)) {
      const stats = fs.statSync(imagePath);
      if (stats.size > 5000) { // Mai mare de 5KB
        if (product.image !== relativeImagePath) {
          await db.execute({
            sql: 'UPDATE Product SET image = ? WHERE id = ?',
            args: [relativeImagePath, product.id]
          });
        }
        skipped++;
        continue;
      }
    }
    
    console.log(`[${i+1}/${result.rows.length}] ${sku}`);
    
    // Extrage URL-ul imaginii de pe SiePortal
    process.stdout.write('  SiePortal... ');
    let imageUrl = await extractImageFromSiePortal(page, sku);
    
    if (!imageUrl) {
      // Încearcă fără sufixuri (-101A, etc.)
      const baseSku = sku.replace(/-\d+[A-Z]*$/, '');
      if (baseSku !== sku) {
        process.stdout.write(`(încerc ${baseSku})... `);
        imageUrl = await extractImageFromSiePortal(page, baseSku);
      }
    }
    
    if (!imageUrl) {
      console.log('nu s-a găsit');
      failedProducts.push(sku);
      failed++;
      continue;
    }
    
    console.log('găsit!');
    
    // Descarcă imaginea
    process.stdout.write('  Descărcare... ');
    try {
      const size = await downloadImage(imageUrl, imagePath);
      
      // Actualizez produsul în baza de date
      await db.execute({
        sql: 'UPDATE Product SET image = ? WHERE id = ?',
        args: [relativeImagePath, product.id]
      });
      
      console.log(`OK (${Math.round(size/1024)}KB)`);
      downloaded++;
      successUrls.set(sku, imageUrl);
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
      failedProducts.push(sku);
      failed++;
    }
    
    // Pauză scurtă între cereri
    await new Promise(r => setTimeout(r, 500));
  }
  
  await browser.close();
  
  console.log('\n=== Rezultat ===');
  console.log(`Descărcate: ${downloaded}`);
  console.log(`Eșuate: ${failed}`);
  console.log(`Skip (existau): ${skipped}`);
  console.log(`Total: ${result.rows.length}`);
  
  if (failedProducts.length > 0 && failedProducts.length <= 20) {
    console.log('\nProduse fără imagine:');
    failedProducts.forEach(sku => console.log(`  - https://sieportal.siemens.com/en-ww/products-services/detail/${sku}`));
  }
  
  // Salvez URL-urile găsite pentru referință
  if (successUrls.size > 0) {
    const urlsFile = path.join(__dirname, 'siemens-image-urls.json');
    fs.writeFileSync(urlsFile, JSON.stringify(Object.fromEntries(successUrls), null, 2));
    console.log(`\nURL-uri salvate în: ${urlsFile}`);
  }
}

main().catch(console.error);
