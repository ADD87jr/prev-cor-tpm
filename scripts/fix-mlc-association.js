require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function fix() {
  console.log('🔧 Corectare asocieri MLC Power Automation...\n');
  
  // Păstrează doar Seria PA la MLC, șterge restul
  const r1 = await db.execute(`
    DELETE FROM SupplierProduct 
    WHERE supplierId = 13 AND productId NOT IN (SELECT id FROM Product WHERE sku = 'Seria PA')
  `);
  console.log(`🗑️  Șterse ${r1.rowsAffected} asocieri greșite din SupplierProduct`);
  
  // Setează supplierId = NULL pentru produsele care nu sunt la MLC
  const r2 = await db.execute(`
    UPDATE Product 
    SET supplierId = NULL 
    WHERE sku IN ('PCTPM2', 'PCTPM-3', 'PCTPM-4', 'PCTPM-5')
  `);
  console.log(`✅ Resetate ${r2.rowsAffected} produse (supplierId = NULL)\n`);
  
  // Verificare
  const mlc = await db.execute(`
    SELECT p.sku, p.name 
    FROM SupplierProduct sp
    JOIN Product p ON p.id = sp.productId
    WHERE sp.supplierId = 13
  `);
  
  console.log('📦 Produse MLC Power Automation:');
  mlc.rows.forEach(r => console.log(`  ${r.sku}: ${r.name}`));
  
  // Produse fără furnizor
  const unassigned = await db.execute(`
    SELECT sku, name, manufacturer FROM Product WHERE supplierId IS NULL
  `);
  
  console.log('\n⚠️  Produse fără furnizor asociat:');
  unassigned.rows.forEach(r => console.log(`  ${r.sku}: ${r.name} (${r.manufacturer})`));
}

fix().then(() => console.log('\n✨ Done!'));
