require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check() {
  const result = await db.execute("SELECT key, updatedAt, length(value) as valLen FROM SiteSettings");
  console.log('Toate cheile din SiteSettings:');
  result.rows.forEach(r => console.log(`  ${r.key}: updatedAt=${r.updatedAt}, valueLen=${r.valLen}`));
}

check().catch(console.error);
