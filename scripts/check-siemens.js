require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  // Verifică imaginile produselor Siemens
  const products = await db.execute("SELECT sku, name, image FROM Product WHERE manufacturer = 'Siemens' LIMIT 10");
  console.log('Imagini produse Siemens:');
  products.rows.forEach(row => {
    console.log('  ', row.sku, '| image:', row.image || '(gol)');
  });
}

main().catch(console.error);
