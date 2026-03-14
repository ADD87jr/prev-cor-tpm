// Script pentru repararea ID-urilor produselor
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function fixProductIds() {
  console.log('=== REPARARE ID-URI PRODUSE ===\n');
  
  await db.execute('PRAGMA foreign_keys = OFF');
  
  // 1. Ia toate produsele
  const all = await db.execute('SELECT id FROM Product ORDER BY ABS(id) ASC');
  console.log('Total produse:', all.rows.length);
  
  // 2. Mută toate la ID-uri temporare foarte negative
  let i = 1;
  for (const p of all.rows) {
    const tempId = -999000 - i;
    await db.execute({
      sql: 'UPDATE Product SET id = ? WHERE id = ?',
      args: [tempId, p.id]
    });
    i++;
  }
  console.log('Faza 1: ID-uri temporare setate');
  
  // 3. Actualizează și SupplierProduct
  await db.execute('DROP TABLE IF EXISTS _temp_mapping');
  await db.execute('CREATE TABLE _temp_mapping (old_id INTEGER, new_id INTEGER)');
  
  i = 1;
  for (const p of all.rows) {
    await db.execute({
      sql: 'INSERT INTO _temp_mapping (old_id, new_id) VALUES (?, ?)',
      args: [p.id, i]
    });
    i++;
  }
  
  // Update SupplierProduct
  const spUpdate = await db.execute(`
    UPDATE SupplierProduct 
    SET productId = (SELECT new_id FROM _temp_mapping WHERE old_id = SupplierProduct.productId)
    WHERE productId IN (SELECT old_id FROM _temp_mapping)
  `);
  console.log('SupplierProduct actualizat:', spUpdate.rowsAffected || 0, 'rânduri');
  
  // 4. Mută la ID-uri finale consecutive
  i = 1;
  for (const p of all.rows) {
    const tempId = -999000 - i;
    await db.execute({
      sql: 'UPDATE Product SET id = ? WHERE id = ?',
      args: [i, tempId]
    });
    i++;
  }
  console.log('Faza 2: ID-uri finale setate (1-' + (i - 1) + ')');
  
  // 5. Resetează autoincrement
  await db.execute(`UPDATE sqlite_sequence SET seq = ${i - 1} WHERE name = 'Product'`);
  
  // 6. Curăță
  await db.execute('DROP TABLE _temp_mapping');
  await db.execute('PRAGMA foreign_keys = ON');
  
  console.log('\n✅ FINALIZAT! ID-uri consecutive: 1-' + (i - 1));
}

fixProductIds().catch(console.error);
