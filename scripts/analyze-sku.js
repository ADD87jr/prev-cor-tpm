require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function analyze() {
  console.log('📊 Analiză prefixe SKU produse Sauter:\n');
  
  const prefixes = await db.execute(`
    SELECT SUBSTR(sku, 1, 2) as prefix, COUNT(*) as cnt 
    FROM Product 
    WHERE manufacturer = 'Sauter' AND sku IS NOT NULL 
    GROUP BY prefix 
    ORDER BY cnt DESC 
    LIMIT 20
  `);
  
  prefixes.rows.forEach(p => {
    console.log(`  ${p.prefix} - ${p.cnt} produse`);
  });
  
  console.log('\n📋 Exemple SKU pentru fiecare prefix major:');
  for (const prefix of ['00', '02', '03', '04', '05', '09', '49', '52']) {
    const ex = await db.execute(`
      SELECT sku, name FROM Product 
      WHERE manufacturer = 'Sauter' AND sku LIKE '${prefix}%'
      LIMIT 1
    `);
    if (ex.rows.length > 0) {
      console.log(`  ${prefix}x: ${ex.rows[0].sku} - ${ex.rows[0].name.substring(0, 50)}`);
    }
  }
}

analyze().catch(console.error);
