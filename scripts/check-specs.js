require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  const result = await db.execute("SELECT specs, advantages, pdfUrl FROM Product WHERE sku = 'PXC7.E400M'");
  console.log('Specs:', result.rows[0].specs);
  console.log('\nAdvantages:', result.rows[0].advantages);
  console.log('\nPDF URL:', result.rows[0].pdfUrl);
}

main().catch(console.error);
