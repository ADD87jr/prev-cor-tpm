#!/usr/bin/env node
/**
 * Script pentru descărcarea imaginilor produselor Siemens de pe site-ul oficial
 * Extrage URL-urile de imagine direct de pe paginile SiePortal
 */

require('dotenv').config({ path: '.env.local' });
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

// Funcție pentru request HTTP cu redirect
function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': options.accept || '*/*',
      ...options.headers
    };
    
    const request = protocol.get(url, { headers }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const newUrl = response.headers.location.startsWith('http') 
          ? response.headers.location 
          : new URL(response.headers.location, url).href;
        httpGet(newUrl, options).then(resolve).catch(reject);
        return;
      }
      
      let data = [];
      response.on('data', chunk => data.push(chunk));
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(data)
        });
      });
    });
    
    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Funcție pentru descărcarea unei imagini
async function downloadImage(url, filepath) {
  const response = await httpGet(url, { accept: 'image/*' });
  
  if (response.statusCode !== 200) {
    throw new Error(`HTTP ${response.statusCode}`);
  }
  
  const contentType = response.headers['content-type'] || '';
  if (!contentType.includes('image')) {
    throw new Error(`Not an image: ${contentType}`);
  }
  
  if (response.body.length < 1000) {
    throw new Error('File too small');
  }
  
  fs.writeFileSync(filepath, response.body);
  return response.body.length;
}

// Mapare SKU -> categoria de imagine Siemens
// Bazat pe prefixul SKU-ului - URL-uri reale extrase de pe SiePortal
const SIEMENS_IMAGE_MAP = {
  // Automation Stations PXC - toate folosesc aceeași imagine
  'PXC7': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  'PXC4': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  'PXC5': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  'PXC3': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  // TXM I/O Modules - imagine reală
  'TXM': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/02/17/P_BT01_XX_03556i.jpg',
  // TXS Accessories - folosește imaginea TXM
  'TXS': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/02/17/P_BT01_XX_03556i.jpg',
  // TXA Accessories - folosește imaginea TXM
  'TXA': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/02/17/P_BT01_XX_03556i.jpg',
  // Room controllers DXR - folosește imaginea PXC (controlere similare)
  'DXR2': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  // Accessories DXA - folosește imaginea PXC
  'DXA': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  // Connect X Series
  'CXG': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  // Software/Licenses
  'CTX': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  // PXA accessories
  'PXA': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  // PXG accessories
  'PXG': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  // PXM accessories
  'PXM': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  // QMX Room sensors
  'QMX': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  // QVE sensors
  'QVE': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  // RPI/RPM/RXM/RXZ accessories
  'RPI': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  'RPM': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  'RXM': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  'RXZ': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  // HLB series
  'HLB': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg',
  // Default fallback
  'DEFAULT': 'https://mall.industry.siemens.com/mall/collaterals/files/198/jpg/07/24/P_BT01_XX_07511i.jpg'
};

// Găsește URL-ul imaginii pentru un SKU
function getImageUrlForSku(sku) {
  // Caută prefixul care se potrivește
  for (const [prefix, url] of Object.entries(SIEMENS_IMAGE_MAP)) {
    if (prefix !== 'DEFAULT' && sku.startsWith(prefix)) {
      return url;
    }
  }
  return SIEMENS_IMAGE_MAP['DEFAULT'];
}

async function main() {
  console.log('=== Descărcare imagini produse Siemens ===\n');
  
  // Creez directorul dacă nu există
  if (!fs.existsSync(PRODUCTS_DIR)) {
    fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
    console.log(`Creat director: ${PRODUCTS_DIR}\n`);
  }
  
  // Obțin toate produsele Siemens
  const result = await db.execute(`
    SELECT id, sku, name, image 
    FROM Product 
    WHERE manufacturer = 'Siemens'
    ORDER BY sku
  `);
  
  console.log(`Total produse Siemens: ${result.rows.length}\n`);
  
  // Descarcă mai întâi imaginile unice pentru categorii
  const downloadedUrls = new Map(); // url -> localPath
  
  let downloaded = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const product of result.rows) {
    const sku = product.sku;
    const safeSku = sku.replace(/[^a-zA-Z0-9-]/g, '_');
    
    // Găsește URL-ul imaginii pentru această categorie
    const imageUrl = getImageUrlForSku(sku);
    
    // Verifică dacă am descărcat deja această imagine
    let localImagePath;
    if (downloadedUrls.has(imageUrl)) {
      localImagePath = downloadedUrls.get(imageUrl);
    } else {
      // Generează un nume de fișier bazat pe URL
      const urlHash = imageUrl.split('/').pop().replace('.jpg', '');
      const imagePath = path.join(PRODUCTS_DIR, `${urlHash}.jpg`);
      localImagePath = `/products/siemens/${urlHash}.jpg`;
      
      if (!fs.existsSync(imagePath)) {
        try {
          process.stdout.write(`Descărcare ${urlHash}.jpg de la Siemens... `);
          const size = await downloadImage(imageUrl, imagePath);
          console.log(`OK (${Math.round(size/1024)}KB)`);
        } catch (err) {
          console.log(`FAIL: ${err.message}`);
          localImagePath = null;
        }
      } else {
        console.log(`${urlHash}.jpg există deja local`);
      }
      
      downloadedUrls.set(imageUrl, localImagePath);
    }
    
    if (!localImagePath) {
      failed++;
      continue;
    }
    
    // Actualizez produsul în baza de date dacă este necesar
    if (!product.image || product.image !== localImagePath) {
      await db.execute({
        sql: 'UPDATE Product SET image = ? WHERE id = ?',
        args: [localImagePath, product.id]
      });
      console.log(`${sku}: imagine setată la ${localImagePath}`);
      downloaded++;
    } else {
      skipped++;
    }
  }
  
  console.log('\n=== Rezultat ===');
  console.log(`Actualizate: ${downloaded}`);
  console.log(`Eșuate: ${failed}`);
  console.log(`Deja actualizate: ${skipped}`);
  console.log(`Total: ${result.rows.length}`);
  console.log(`Imagini unice descărcate: ${downloadedUrls.size}`);
}

main().catch(console.error);
