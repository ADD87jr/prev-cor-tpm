#!/usr/bin/env node
/**
 * Script pentru corectarea completă a numelor produselor Siemens
 * Elimină orice cod duplicat/parțial duplicat
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('=== Corectare completă nume produse Siemens ===\n');
  
  // Obțin toate produsele Siemens
  const products = await db.execute(`
    SELECT id, name, sku
    FROM Product 
    WHERE manufacturer = 'Siemens'
  `);
  
  let fixed = 0;
  
  for (const product of products.rows) {
    const { id, name, sku } = product;
    let newName = name.trim();
    
    // Extrage prefixul de bază din SKU (ex: DXR2.E10PL din DXR2.E10PL-102B)
    const skuBase = sku.split('-')[0]; // DXR2.E10PL
    
    // Verifică dacă numele conține codul de bază duplicat
    // Pattern: "SKU-123 SKUbase descriere" -> "SKU-123 descriere"
    if (newName.startsWith(sku) && newName.includes(` ${skuBase} `)) {
      // Elimină a doua apariție a codului de bază
      newName = newName.replace(` ${skuBase} `, ' ');
    }
    
    // Curăță spațiile multiple
    newName = newName.replace(/\s+/g, ' ').trim();
    
    if (newName !== name) {
      await db.execute({
        sql: `UPDATE Product SET name = ? WHERE id = ?`,
        args: [newName, id]
      });
      console.log(`Corectat: "${name}" -> "${newName}"`);
      fixed++;
    }
  }
  
  console.log(`\nCorectat: ${fixed} produse`);
  
  // Verificare finală
  const check = await db.execute(`
    SELECT name, sku
    FROM Product 
    WHERE manufacturer = 'Siemens' AND name LIKE '%DXR%'
  `);
  
  console.log('\nVerificare DXR:');
  check.rows.forEach(p => {
    console.log(`  ${p.sku}: "${p.name}"`);
  });
}

main().catch(console.error);
