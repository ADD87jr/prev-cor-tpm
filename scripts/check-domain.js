require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check() {
  const domains = await db.execute(`SELECT domain, COUNT(*) as cnt FROM Product GROUP BY domain`);
  console.log('Domenii în DB:');
  domains.rows.forEach(r => console.log(`  ${r.domain || 'NULL'}: ${r.cnt} produse`));
  
  const sauter = await db.execute(`SELECT domain FROM Product WHERE manufacturer = 'Sauter' LIMIT 5`);
  console.log('\nExemplu produse Sauter:');
  sauter.rows.forEach(r => console.log(`  domain: ${r.domain}`));
}

check();
