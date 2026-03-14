#!/usr/bin/env node
/**
 * Script pentru actualizarea prețurilor și termenilor produselor Siemens
 * - Discount: 10%
 * - Preț de achiziție (purchasePrice): 20% mai ieftin decât prețul de listă
 * - Termen livrare: 7-10 zile
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('=== Actualizare prețuri și termeni produse Siemens ===\n');
  
  // Obțin toate produsele Siemens
  const products = await db.execute(`
    SELECT id, sku, price, listPrice, purchasePrice, discount, deliveryTime 
    FROM Product 
    WHERE manufacturer = 'Siemens'
  `);
  
  console.log(`Total produse Siemens: ${products.rows.length}`);
  
  // Afișez câteva exemple înainte de actualizare
  console.log('\nExemple ÎNAINTE de actualizare:');
  products.rows.slice(0, 3).forEach(p => {
    console.log(`  ${p.sku}: preț=${p.price}, listPrice=${p.listPrice}, purchasePrice=${p.purchasePrice}, discount=${p.discount}%, livrare=${p.deliveryTime || '(gol)'}`);
  });
  
  let updated = 0;
  
  for (const product of products.rows) {
    // Prețul de listă este baza de calcul
    // Dacă nu există listPrice, folosesc price ca bază
    const listPrice = parseFloat(product.listPrice) || parseFloat(product.price) || 0;
    
    // Calculez prețul de achiziție (20% mai ieftin decât prețul de listă)
    const purchasePrice = Math.round(listPrice * 0.80 * 100) / 100;
    
    // Discount 10% (se aplică la listPrice pentru a obține prețul de vânzare)
    const discount = 10;
    
    // Prețul de vânzare = listPrice - 10%
    const price = Math.round(listPrice * 0.90 * 100) / 100;
    
    // Termen de livrare
    const deliveryTime = '7-10 zile lucrătoare';
    
    await db.execute({
      sql: `UPDATE Product 
            SET price = ?,
                listPrice = ?,
                purchasePrice = ?, 
                discount = ?, 
                deliveryTime = ?
            WHERE id = ?`,
      args: [price, listPrice, purchasePrice, discount, deliveryTime, product.id]
    });
    
    updated++;
  }
  
  console.log(`\nActualizate: ${updated} produse`);
  
  // Verificare după actualizare
  const check = await db.execute(`
    SELECT id, sku, price, listPrice, purchasePrice, discount, deliveryTime 
    FROM Product 
    WHERE manufacturer = 'Siemens'
    LIMIT 5
  `);
  
  console.log('\nExemple DUPĂ actualizare:');
  check.rows.forEach(p => {
    const margin = p.purchasePrice > 0 ? Math.round((p.price - p.purchasePrice) / p.price * 100) : 0;
    console.log(`  ${p.sku}:`);
    console.log(`    Preț listă: ${p.listPrice} RON`);
    console.log(`    Preț vânzare (cu -${p.discount}%): ${p.price} RON`);
    console.log(`    Preț achiziție: ${p.purchasePrice} RON`);
    console.log(`    Marjă: ${margin}%`);
    console.log(`    Livrare: ${p.deliveryTime}`);
  });
}

main().catch(console.error);
