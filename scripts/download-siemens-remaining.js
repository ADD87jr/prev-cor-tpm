#!/usr/bin/env node
/**
 * Script pentru descărcarea imaginilor produselor Siemens rămase
 */

require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const { createClient } = require('@libsql/client');
const https = require('https');
const fs = require('fs');
const path = require('path');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const PRODUCTS_DIR = path.join(__dirname, '..', 'public', 'products', 'siemens');

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://sieportal.siemens.com/'
      }
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      response.on('data', c => chunks.push(c));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(filepath, buffer);
        resolve(buffer.length);
      });
    }).on('error', reject);
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();
  
  // Produse care au eșuat - încerc cu prefixe alternative
  const failedProducts = [
    { sku: 'RXZ20.1', urls: ['bpz:rxz20.1', 'BPZ:RXZ20.1'] },
    { sku: 'RXZ30.1', urls: ['bpz:rxz30.1', 'BPZ:RXZ30.1'] },
    { sku: 'CTX-LEN.5M', urls: ['CTX-LEN.5M'] } // Software, probabil nu are imagine
  ];
  
  for (const product of failedProducts) {
    console.log(`\n=== ${product.sku} ===`);
    
    let imageUrl = null;
    
    for (const altSku of product.urls) {
      const url = `https://sieportal.siemens.com/en-ww/products-services/detail/${encodeURIComponent(altSku)}`;
      console.log(`Încerc: ${url}`);
      
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        imageUrl = await page.evaluate(() => {
          // Caută imaginea produsului
          const selectors = [
            'img[alt="Product image"]',
            'img[src*="mall.industry.siemens.com"]',
            'img[src*="collaterals"]',
            'img[src*="P_BT"]'
          ];
          
          for (const sel of selectors) {
            const img = document.querySelector(sel);
            if (img && img.src && img.src.includes('http') && !img.src.includes('svg')) {
              return img.src;
            }
          }
          return null;
        });
        
        if (imageUrl) {
          console.log(`  Imagine găsită: ${imageUrl}`);
          break;
        }
      } catch (err) {
        console.log(`  Eroare: ${err.message}`);
      }
    }
    
    if (imageUrl) {
      const safeSku = product.sku.replace(/[^a-zA-Z0-9-]/g, '_');
      const filepath = path.join(PRODUCTS_DIR, `${safeSku}.jpg`);
      const relPath = `/products/siemens/${safeSku}.jpg`;
      
      try {
        const size = await downloadImage(imageUrl, filepath);
        console.log(`  Descărcat: ${Math.round(size/1024)}KB`);
        
        // Actualizez DB
        const dbResult = await db.execute(`SELECT id FROM Product WHERE sku = '${product.sku}' AND manufacturer = 'Siemens'`);
        if (dbResult.rows.length > 0) {
          await db.execute({
            sql: 'UPDATE Product SET image = ? WHERE id = ?',
            args: [relPath, dbResult.rows[0].id]
          });
          console.log(`  DB actualizat`);
        }
      } catch (err) {
        console.log(`  Descărcare eșuată: ${err.message}`);
      }
    } else {
      console.log(`  Nu s-a găsit imagine - acest produs va folosi placeholder`);
    }
  }
  
  await browser.close();
  console.log('\n=== Gata ===');
}

main().catch(console.error);
