/**
 * Script pentru a marca corect produsele Spare Parts din importul EPL
 * și a reseta componentele (00-05) la tipul corect
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function fixTypes() {
  console.log('🔧 Corectare tipuri produse Sauter...\n');
  
  // 1. Resetează TOATE produsele Sauter la Actuatoare (tipul default)
  await db.execute(`
    UPDATE Product 
    SET type = 'Actuatoare'
    WHERE manufacturer = 'Sauter'
  `);
  console.log('1️⃣  Resetate toate produsele Sauter la "Actuatoare"');
  
  // 2. Marchează doar produsele EPL Spare Parts (P1xxx, P2xxx, VUS, GZS, PI)
  // NU includem SKU-uri numerice care încep cu 00-05 (sunt Components)
  const result = await db.execute(`
    UPDATE Product 
    SET type = 'Spare Parts'
    WHERE manufacturer = 'Sauter'
      AND (
        sku LIKE 'P1%' OR sku LIKE 'P2%' OR
        sku LIKE 'VUS%' OR sku LIKE 'GZS%' OR 
        sku LIKE 'PI%'
      )
  `);
  console.log(`2️⃣  Marcate ${result.rowsAffected} produse ca "Spare Parts"\n`);
  
  // Verificare statistici
  const stats = await db.execute(`
    SELECT type, COUNT(*) as cnt 
    FROM Product 
    WHERE manufacturer = 'Sauter'
    GROUP BY type 
    ORDER BY cnt DESC
  `);
  
  console.log('📊 Statistici tipuri produse Sauter:');
  stats.rows.forEach(s => {
    console.log(`  ${(s.type || 'N/A').padEnd(20)} - ${s.cnt} produse`);
  });
  
  // Exemple Spare Parts
  const examples = await db.execute(`
    SELECT sku, name, type FROM Product 
    WHERE type = 'Spare Parts' 
    LIMIT 10
  `);
  console.log('\n📋 Exemple Spare Parts:');
  examples.rows.forEach(p => {
    console.log(`  ${(p.sku || 'N/A').padEnd(15)} - ${p.name.substring(0, 35)}`);
  });
}

fixTypes()
  .then(() => console.log('\n✨ Done!'))
  .catch(console.error);
