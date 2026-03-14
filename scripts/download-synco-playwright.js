#!/usr/bin/env node
/**
 * Script Playwright pentru descărcarea imaginilor produselor SYNCO
 * Extrage imaginile direct de pe SiePortal
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
    
    // Caută imaginea produsului
    const imageUrl = await page.evaluate(() => {
      // Variante de selectori pentru imagine
      const selectors = [
        'img.product-image',
        'img[alt*="product"]',
        '.product-detail img',
        '.gallery img',
        'img[src*="assets.new.siemens.com"]',
        'img[src*="product"]'
      ];
      
      for (const selector of selectors) {
        const img = document.querySelector(selector);
        if (img && img.src && !img.src.includes('placeholder')) {
          return img.src;
        }
      }
      
      // Caută orice imagine mare
      const images = Array.from(document.querySelectorAll('img'));
      for (const img of images) {
        if (img.naturalWidth > 200 && img.naturalHeight > 200) {
          return img.src;
        }
      }
      
      return null;
    });
    
    return imageUrl;
  } catch (err) {
    return null;
  }
}

async function downloadSyncoImages() {
  console.log('=== Descărcare imagini produse SYNCO cu Playwright ===\n');
  
  // Asigură-te că directorul există
  if (!fs.existsSync(PRODUCTS_DIR)) {
    fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
  }
  
  const result = await db.execute(`
    SELECT id, sku, name 
    FROM Product 
    WHERE sku LIKE 'RLU%' OR sku LIKE 'RMU%' OR sku LIKE 'RMK%' OR 
          sku LIKE 'RMB%' OR sku LIKE 'RMS%' OR sku LIKE 'RMZ%' OR 
          sku LIKE 'RMH%' OR sku LIKE 'SEZ%' OR sku LIKE 'SEA%' OR 
          sku LIKE 'SEM%' OR sku LIKE 'ARG%' OR sku LIKE 'BAU%' OR 
          sku LIKE 'EM1%' OR sku LIKE 'RLE%'
    ORDER BY sku
  `);
  
  console.log(`Găsite ${result.rows.length} produse SYNCO\n`);
  
  // Lansează browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let downloaded = 0;
  let failed = 0;
  
  for (const product of result.rows) {
    const imageName = product.sku.replace(/[./-]/g, '_');
    const localPath = path.join(PRODUCTS_DIR, `${imageName}.jpg`);
    const dbPath = `/products/siemens/${imageName}.jpg`;
    
    // Verifică dacă imaginea există deja
    if (fs.existsSync(localPath)) {
      const stats = fs.statSync(localPath);
      if (stats.size > 1000) {
        console.log(`✓ ${product.sku} - imagine existentă`);
        await db.execute({
          sql: 'UPDATE Product SET image = ? WHERE id = ?',
          args: [dbPath, product.id]
        });
        downloaded++;
        continue;
      }
    }
    
    // Extrage URL-ul imaginii de pe SiePortal
    const imageUrl = await extractImageFromSiePortal(page, product.sku);
    
    if (imageUrl) {
      try {
        await downloadImage(imageUrl, localPath);
        console.log(`✅ ${product.sku} - descărcată`);
        
        await db.execute({
          sql: 'UPDATE Product SET image = ? WHERE id = ?',
          args: [dbPath, product.id]
        });
        
        downloaded++;
      } catch (err) {
        console.log(`⚠ ${product.sku} - eroare la descărcare: ${err.message}`);
        failed++;
      }
    } else {
      console.log(`⚠ ${product.sku} - nu s-a găsit imagine`);
      failed++;
    }
    
    // Pauză între cereri
    await new Promise(r => setTimeout(r, 1000));
  }
  
  await browser.close();
  
  console.log(`\n=== REZUMAT ===`);
  console.log(`Descărcate/existente: ${downloaded}`);
  console.log(`Fără imagine: ${failed}`);
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
