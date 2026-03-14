require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function update() {
  console.log('🔧 Actualizare domeniu pentru toate produsele Sauter -> HVAC\n');
  
  const result = await db.execute(`UPDATE Product SET domain = 'HVAC' WHERE manufacturer = 'Sauter'`);
  console.log(`✅ Actualizate ${result.rowsAffected} produse\n`);
  
  // Verificare
  const check = await db.execute(`
    SELECT domain, type, COUNT(*) as cnt 
    FROM Product 
    WHERE manufacturer = 'Sauter' 
    GROUP BY domain, type 
    ORDER BY cnt DESC
  `);
  
  console.log('📊 Distribuție finală produse Sauter:');
  check.rows.forEach(r => {
    console.log(`  ${(r.domain || 'N/A').padEnd(15)} | ${(r.type || 'N/A').padEnd(20)} | ${r.cnt} produse`);
  });
}

update().then(() => console.log('\n✨ Done!'));
