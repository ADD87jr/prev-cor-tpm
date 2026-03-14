require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function fix() {
  console.log('🔧 Asociere produse cu furnizori...\n');
  
  // Asociază produsele Sauter cu furnizorul Sauter (id=15)
  const r1 = await db.execute(`UPDATE Product SET supplierId = 15 WHERE manufacturer = 'Sauter'`);
  console.log(`✅ Asociate ${r1.rowsAffected} produse Sauter cu furnizorul Sauter (id=15)`);
  
  // Verificare
  const check = await db.execute(`
    SELECT s.name as supplier, COUNT(p.id) as products
    FROM Supplier s
    LEFT JOIN Product p ON p.supplierId = s.id
    GROUP BY s.id, s.name
    ORDER BY products DESC
  `);
  
  console.log('\n📊 Produse per furnizor:');
  check.rows.forEach(r => {
    console.log(`  ${r.supplier.padEnd(40)} - ${r.products} produse`);
  });
}

fix().then(() => console.log('\n✨ Done!'));
