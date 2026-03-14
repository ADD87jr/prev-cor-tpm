/**
 * Script pentru actualizarea produselor EPL Spare Parts
 * - Setează manufacturer = "Sauter"
 * - Setează type = "Spare Parts" 
 * - Calculează purchasePrice = listPrice (Net prices)
 * - Calculează price = listPrice * 0.90 (10% discount)
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function updateEplProducts() {
  console.log('🔧 Actualizare produse importate din EPL Spare Parts...\n');
  
  // Verifică produsele fără manufacturer care par a fi din EPL
  const check = await db.execute(`
    SELECT id, sku, name, manufacturer, listPrice, purchasePrice, type
    FROM Product 
    WHERE (manufacturer IS NULL OR manufacturer = '')
      AND listPrice IS NOT NULL AND listPrice > 0
  `);
  
  console.log(`📦 Găsite ${check.rows.length} produse fără manufacturer\n`);
  
  if (check.rows.length > 0) {
    console.log('Exemple:');
    check.rows.slice(0, 10).forEach(p => {
      console.log(`  ${(p.sku || 'N/A').padEnd(15)} | ${p.name.substring(0, 30).padEnd(30)} | LP: ${p.listPrice} | PP: ${p.purchasePrice}`);
    });
  }
  
  // Actualizează toate produsele din importul EPL (fără manufacturer)
  // Le setăm ca Sauter Spare Parts cu Net prices
  const result = await db.execute(`
    UPDATE Product 
    SET manufacturer = 'Sauter',
        type = 'Spare Parts',
        purchasePrice = listPrice,
        price = ROUND(listPrice * 0.90, 2),
        discount = 10,
        discountType = 'percent'
    WHERE (manufacturer IS NULL OR manufacturer = '')
      AND listPrice IS NOT NULL AND listPrice > 0
  `);
  
  console.log(`\n✅ Actualizate ${result.rowsAffected} produse EPL\n`);
  
  // Verificare finală
  const verify = await db.execute(`
    SELECT sku, name, manufacturer, listPrice, purchasePrice, price, type
    FROM Product 
    WHERE sku IN ('BEFUNDBERICHT', 'P100003500', 'P200047102S', '0034181000', 'VUS015F345FB')
  `);
  
  console.log('📋 Verificare produse EPL actualizate:');
  verify.rows.forEach(p => {
    const isNet = p.listPrice === p.purchasePrice ? '✅ NET' : '❌';
    console.log(`  ${(p.sku || 'N/A').padEnd(15)} | LP: ${String(p.listPrice).padStart(8)} | PP: ${String(p.purchasePrice).padStart(8)} | ${isNet} | Type: ${p.type}`);
  });
  
  // Statistici finale
  console.log('\n📊 Statistici finale produse Sauter:');
  const stats = await db.execute(`
    SELECT type, COUNT(*) as cnt 
    FROM Product 
    WHERE manufacturer = 'Sauter'
    GROUP BY type 
    ORDER BY cnt DESC
  `);
  stats.rows.forEach(s => {
    console.log(`  ${(s.type || 'N/A').padEnd(20)} - ${s.cnt} produse`);
  });
  
  const total = await db.execute(`SELECT COUNT(*) as cnt FROM Product WHERE manufacturer = 'Sauter'`);
  console.log(`\n  Total produse Sauter: ${total.rows[0].cnt}`);
}

updateEplProducts()
  .then(() => console.log('\n✨ Done!'))
  .catch(console.error);
