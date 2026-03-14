require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check() {
  // Găsește produsul Seria PA
  const p = await db.execute(`SELECT id, name FROM Product WHERE sku = 'Seria PA'`);
  console.log('Product Seria PA:', p.rows[0]);
  
  const productId = p.rows[0]?.id;
  if (!productId) {
    console.log('Produsul nu a fost găsit!');
    return;
  }
  
  // Verifică schema ProductVariant
  console.log('\n--- Schema ProductVariant ---');
  const pv_schema = await db.execute(`PRAGMA table_info(ProductVariant)`);
  pv_schema.rows.forEach(c => console.log(`  ${c.name}: ${c.type}`));
  
  // Verifică variantele
  const v = await db.execute(`SELECT * FROM ProductVariant WHERE productId = ${productId}`);
  console.log(`\nVariante (${v.rows.length}):`);
  v.rows.forEach(r => console.log(`  ${r.id}: ${r.nume || r.name} - ${r.pret} EUR`));
  
  // Verifică schema SupplierProduct - poate are suport pentru variante?
  console.log('\n--- Schema SupplierProduct ---');
  const schema = await db.execute(`PRAGMA table_info(SupplierProduct)`);
  schema.rows.forEach(c => console.log(`  ${c.name}: ${c.type}`));
}

check();
