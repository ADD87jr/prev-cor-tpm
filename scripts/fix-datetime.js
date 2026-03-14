require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function fix() {
  // Corectează formatul updatedAt pentru toate SiteSettings
  await db.execute("UPDATE SiteSettings SET updatedAt = '2026-03-07T19:11:08.000Z' WHERE updatedAt LIKE '2026-03-07 %'");
  console.log('✅ Formatul updatedAt corectat!');
  
  // Verifică
  const result = await db.execute("SELECT key, updatedAt FROM SiteSettings");
  result.rows.forEach(r => console.log(`  ${r.key}: ${r.updatedAt}`));
}

fix().catch(console.error);
