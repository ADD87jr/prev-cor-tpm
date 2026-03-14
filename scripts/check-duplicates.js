require('dotenv/config');
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  // Verifică duplicate pe SKU
  console.log('=== Verificare duplicate pe SKU ===\n');
  
  const duplicateSku = await client.execute(`
    SELECT sku, COUNT(*) as cnt, GROUP_CONCAT(id) as ids
    FROM Product 
    GROUP BY sku 
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
    LIMIT 20
  `);
  
  console.log(`Duplicate pe SKU: ${duplicateSku.rows.length}\n`);
  duplicateSku.rows.forEach(row => {
    console.log(`  SKU: ${row.sku} - ${row.cnt} duplicate (IDs: ${row.ids})`);
  });
  
  // Verifică duplicate pe nume
  console.log('\n=== Verificare duplicate pe Nume ===\n');
  
  const duplicateName = await client.execute(`
    SELECT name, COUNT(*) as cnt, GROUP_CONCAT(id) as ids, GROUP_CONCAT(sku) as skus
    FROM Product 
    GROUP BY name 
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
    LIMIT 20
  `);
  
  console.log(`Duplicate pe Nume: ${duplicateName.rows.length}\n`);
  duplicateName.rows.slice(0, 10).forEach(row => {
    console.log(`  Nume: "${row.name.substring(0, 50)}..." - ${row.cnt} duplicate`);
    console.log(`    SKUs: ${row.skus}`);
    console.log(`    IDs: ${row.ids}\n`);
  });
  
  // Statistici generale
  console.log('=== Statistici generale ===\n');
  
  const stats = await client.execute(`
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT sku) as unique_sku,
      COUNT(DISTINCT name) as unique_name
    FROM Product
  `);
  
  const s = stats.rows[0];
  console.log(`Total produse: ${s.total}`);
  console.log(`SKU-uri unice: ${s.unique_sku}`);
  console.log(`Nume unice: ${s.unique_name}`);
  console.log(`Diferență (posibile duplicate): ${s.total - s.unique_sku}`);
}

main().catch(console.error);
