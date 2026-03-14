#!/usr/bin/env node
/**
 * Script pentru curățare finală a numelor produselor Siemens
 * - Elimină spațiile multiple
 * - Elimină spațiile de la început/sfârșit
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('=== Curățare finală nume produse Siemens ===\n');
  
  // Obțin toate produsele Siemens
  const products = await db.execute(`
    SELECT id, name, sku
    FROM Product 
    WHERE manufacturer = 'Siemens'
  `);
  
  let fixed = 0;
  
  for (const product of products.rows) {
    const { id, name, sku } = product;
    
    // Curăță numele: elimină spații multiple, trim, și elimină spații duble
    let newName = name
      .trim()
      .replace(/\s+/g, ' '); // Înlocuiește spații multiple cu unul singur
    
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
    WHERE manufacturer = 'Siemens'
    LIMIT 10
  `);
  
  console.log('\nVerificare finală:');
  check.rows.forEach(p => {
    console.log(`  ${p.sku}: "${p.name}"`);
  });
}

main().catch(console.error);
