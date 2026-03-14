#!/usr/bin/env node
/**
 * Script pentru corectarea numelor produselor Siemens (elimină duplicatul codului)
 * și eliminarea link-urilor PDF
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('=== Corectare nume produse Siemens ===\n');
  
  // Obțin toate produsele Siemens
  const products = await db.execute(`
    SELECT id, name, sku, pdfUrl 
    FROM Product 
    WHERE manufacturer = 'Siemens'
  `);
  
  console.log(`Total produse Siemens: ${products.rows.length}\n`);
  
  let fixed = 0;
  
  for (const product of products.rows) {
    const { id, name, sku } = product;
    let newName = name;
    
    // Verifică dacă numele începe cu SKU duplicat (ex: "PXC7.E400S PXC7.E400S Automation Station")
    if (name && sku) {
      // Pattern: SKU SKU restul -> SKU restul
      const duplicatePattern = new RegExp(`^${sku.replace(/\./g, '\\.')}\\s+${sku.replace(/\./g, '\\.')}\\s+`);
      if (duplicatePattern.test(name)) {
        newName = name.replace(duplicatePattern, `${sku} `);
      }
    }
    
    // Actualizez numele și elimin PDF URL
    await db.execute({
      sql: `UPDATE Product 
            SET name = ?, 
                pdfUrl = NULL,
                pdfUrlEn = NULL
            WHERE id = ?`,
      args: [newName, id]
    });
    
    if (newName !== name) {
      console.log(`Corectat: "${name}" -> "${newName}"`);
      fixed++;
    }
  }
  
  console.log(`\nCorectat nume: ${fixed} produse`);
  console.log(`Eliminat PDF URL: ${products.rows.length} produse`);
  
  // Verificare
  const check = await db.execute(`
    SELECT name, sku, pdfUrl 
    FROM Product 
    WHERE manufacturer = 'Siemens'
    LIMIT 5
  `);
  
  console.log('\nVerificare:');
  check.rows.forEach(p => {
    console.log(`  ${p.sku}: "${p.name}" | PDF: ${p.pdfUrl || '(eliminat)'}`);
  });
}

main().catch(console.error);
