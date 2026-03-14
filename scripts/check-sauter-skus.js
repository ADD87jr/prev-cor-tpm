// Script pentru a analiza SKU-urile produselor Sauter
const { createClient } = require('@libsql/client');
require('dotenv').config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  // 1. Verifică SKU-uri care încep cu litere (AVM, ADM, ASM, AKM, etc.)
  console.log('=== SKU-uri alfanumerice Sauter (primele 30) ===');
  const alphaResult = await db.execute(
    `SELECT sku, name FROM Product 
     WHERE manufacturer = 'Sauter' AND sku < '0'
     ORDER BY sku LIMIT 30`
  );
  alphaResult.rows.forEach(r => console.log(r.sku, '-', r.name));
  
  console.log('\n=== Exemple nume produse Sauter (primele 30) ===');
  const namesResult = await db.execute(
    `SELECT name, sku FROM Product 
     WHERE manufacturer = 'Sauter' 
     ORDER BY name LIMIT 30`
  );
  namesResult.rows.forEach(r => console.log(r.name, '|', r.sku));
  
  console.log('\n=== Statistici SKU-uri ===');
  const statsResult = await db.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN sku LIKE 'AVM%' THEN 1 ELSE 0 END) as avm_count,
      SUM(CASE WHEN sku LIKE 'ADM%' THEN 1 ELSE 0 END) as adm_count,
      SUM(CASE WHEN sku LIKE 'ASM%' THEN 1 ELSE 0 END) as asm_count,
      SUM(CASE WHEN sku LIKE 'AKM%' THEN 1 ELSE 0 END) as akm_count,
      SUM(CASE WHEN sku LIKE 'AK%' THEN 1 ELSE 0 END) as ak_count,
      SUM(CASE WHEN sku LIKE 'EG%' THEN 1 ELSE 0 END) as eg_count,
      SUM(CASE WHEN sku LIKE 'VU%' THEN 1 ELSE 0 END) as vu_count,
      SUM(CASE WHEN sku LIKE 'BU%' THEN 1 ELSE 0 END) as bu_count,
      SUM(CASE WHEN sku LIKE '0%' THEN 1 ELSE 0 END) as numeric_count
    FROM Product WHERE manufacturer = 'Sauter'
  `);
  console.log(statsResult.rows[0]);
  
  console.log('\n=== Pattern-uri SKU (primele 20 distincte) ===');
  const patternResult = await db.execute(`
    SELECT SUBSTR(sku, 1, 3) as prefix, COUNT(*) as cnt
    FROM Product WHERE manufacturer = 'Sauter'
    GROUP BY prefix ORDER BY cnt DESC LIMIT 20
  `);
  patternResult.rows.forEach(r => console.log(r.prefix, ':', r.cnt));
}

main().catch(console.error);
