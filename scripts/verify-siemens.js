require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function check() {
  const result = await db.execute(`
    SELECT sku, name, description 
    FROM Product 
    WHERE sku IN ('RLU222', 'PXC7.E400S', 'DXR2.E10-101A', 'TXM1.8D')
  `);
  
  console.log('=== Verificare produse Siemens ===\n');
  
  result.rows.forEach(p => {
    console.log(`SKU: ${p.sku}`);
    console.log(`Nume: ${p.name}`);
    console.log(`Descriere: ${p.description}`);
    console.log('');
  });
  
  process.exit(0);
}

check();
