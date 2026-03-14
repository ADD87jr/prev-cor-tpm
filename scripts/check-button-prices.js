require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  // Verifică produsele Button
  const result = await db.execute(`
    SELECT name, price, listPrice, purchasePrice 
    FROM Product 
    WHERE name LIKE '%Button%B1L%' 
    LIMIT 5
  `);
  
  console.log('Produse Button:');
  for (const p of result.rows) {
    const marja = ((p.price - p.purchasePrice) / p.purchasePrice * 100).toFixed(1);
    console.log(`${p.name}:`);
    console.log(`  listPrice=${p.listPrice}, price=${p.price}, purchasePrice=${p.purchasePrice}`);
    console.log(`  Marjă calculată: ${marja}%`);
    console.log(`  Marjă corectă ar fi: ${((p.price - p.listPrice * 0.65) / (p.listPrice * 0.65) * 100).toFixed(1)}%`);
    console.log('');
  }
}

main().catch(console.error);
