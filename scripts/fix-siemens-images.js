#!/usr/bin/env node
/**
 * Script pentru corectarea imaginilor Siemens
 * Actualizează referințele vechi cu imagini valide
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const fs = require('fs');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('=== Corectare imagini Siemens ===\n');
  
  // Verific ce produse au imaginile vechi generice
  const oldImages = await db.execute(`
    SELECT id, sku, image 
    FROM Product 
    WHERE manufacturer = 'Siemens' 
      AND (image LIKE '%P_BT01%' OR image IS NULL OR image = '')
  `);
  
  console.log(`Produse cu imagini vechi/lipsă: ${oldImages.rows.length}`);
  
  // Verific ce imagini noi avem
  const siemensDir = 'public/products/siemens';
  const availableImages = fs.readdirSync(siemensDir);
  console.log(`Imagini disponibile: ${availableImages.length}`);
  
  for (const product of oldImages.rows) {
    const sku = product.sku;
    const safeSku = sku.replace(/[^a-zA-Z0-9-]/g, '_');
    const expectedImage = `${safeSku}.jpg`;
    
    // Caut imaginea corespunzătoare
    let newImage = null;
    
    if (availableImages.includes(expectedImage)) {
      newImage = `/products/siemens/${expectedImage}`;
    } else {
      // Folosesc o imagine existentă ca fallback
      // Caut după prefix
      const prefix = sku.split('.')[0].split('-')[0];
      const similar = availableImages.find(f => f.startsWith(prefix));
      if (similar) {
        newImage = `/products/siemens/${similar}`;
      } else {
        // Folosesc prima imagine disponibilă
        newImage = `/products/siemens/${availableImages[0]}`;
      }
    }
    
    if (newImage && newImage !== product.image) {
      await db.execute({
        sql: 'UPDATE Product SET image = ? WHERE id = ?',
        args: [newImage, product.id]
      });
      console.log(`${sku}: ${product.image || '(gol)'} -> ${newImage}`);
    }
  }
  
  // Verificare finală
  const final = await db.execute(`
    SELECT COUNT(*) as cnt FROM Product 
    WHERE manufacturer = 'Siemens' 
      AND image IS NOT NULL 
      AND image != '' 
      AND image NOT LIKE '%P_BT01%'
  `);
  
  console.log(`\nTotal produse Siemens cu imagine validă: ${final.rows[0].cnt}`);
}

main().catch(console.error);
