require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  // Caut licențele/serviciile cu preț 0.01
  const result = await db.execute(`
    SELECT id, sku, name, price, listPrice, purchasePrice 
    FROM Product 
    WHERE price = 0.01 OR name LIKE '%CASE Suite%Enterprise%' OR sku LIKE '%GZS150%'
  `);
  
  console.log('Licențe și servicii găsite:');
  for (const p of result.rows) {
    console.log(`ID: ${p.id}, SKU: ${p.sku}`);
    console.log(`  Name: ${p.name}`);
    console.log(`  price=${p.price}, listPrice=${p.listPrice}, purchasePrice=${p.purchasePrice}`);
    console.log('');
  }
}

main().catch(console.error);
