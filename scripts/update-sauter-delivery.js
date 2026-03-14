require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function update() {
  console.log('🔧 Actualizare termen livrare pentru produsele Sauter -> 7-10 zile\n');
  
  const result = await db.execute(`
    UPDATE Product 
    SET deliveryTime = '7-10 zile',
        deliveryTimeEn = '7-10 days'
    WHERE manufacturer = 'Sauter'
  `);
  
  console.log(`✅ Actualizate ${result.rowsAffected} produse\n`);
  
  // Verificare
  const check = await db.execute(`
    SELECT sku, name, deliveryTime 
    FROM Product 
    WHERE manufacturer = 'Sauter'
    LIMIT 5
  `);
  
  console.log('📋 Verificare (5 exemple):');
  check.rows.forEach(r => {
    console.log(`  ${(r.sku || '').padEnd(18)} | ${r.deliveryTime}`);
  });
}

update().then(() => console.log('\n✨ Done!'));
