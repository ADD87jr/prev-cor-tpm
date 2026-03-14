require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check() {
  const p = await db.execute(`
    SELECT id, sku, name, manufacturer 
    FROM Product 
    WHERE manufacturer IS NULL OR manufacturer != 'Sauter'
  `);
  
  console.log(`Produse non-Sauter (${p.rows.length}):\n`);
  p.rows.forEach(r => {
    console.log(`  ${r.id}: ${(r.sku || 'N/A').padEnd(20)} | ${(r.manufacturer || 'N/A').padEnd(15)} | ${r.name.substring(0, 40)}`);
  });
}

check();
