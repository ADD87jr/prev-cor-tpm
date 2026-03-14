require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  // Verific senzorul Autonics
  const result = await db.execute(`
    SELECT name, price, listPrice, purchasePrice 
    FROM Product 
    WHERE name LIKE '%Autonics%BR200%'
  `);
  
  console.log('Produse Autonics BR200:');
  for (const p of result.rows) {
    const margin = ((p.price - p.purchasePrice) / p.purchasePrice * 100).toFixed(1);
    console.log(`${p.name}:`);
    console.log(`  listPrice=${p.listPrice}, price=${p.price}, purchasePrice=${p.purchasePrice}`);
    console.log(`  Marjă: ${margin}%`);
    console.log('');
  }
}

main().catch(console.error);
