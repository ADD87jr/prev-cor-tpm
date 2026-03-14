require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  // Găsește produsele non-Sauter
  const prods = await db.execute(`
    SELECT id, name, sku, manufacturer, purchasePrice 
    FROM Product 
    WHERE manufacturer IS NULL OR manufacturer != 'Sauter'
  `);
  console.log('Produse non-Sauter:');
  prods.rows.forEach(p => console.log(`  ${p.id}: ${p.name} (${p.sku}) - manufacturer: ${p.manufacturer}`));

  // Găsește furnizorul TME
  let suppliers = await db.execute(`SELECT id, name FROM Supplier WHERE name LIKE '%Transfer%' OR name LIKE '%TME%' OR name LIKE '%Multisort%'`);
  console.log('\nFurnizori TME găsiți:', suppliers.rows);

  let tmeId;
  if (suppliers.rows.length === 0) {
    // Creează furnizorul TME
    console.log('\nCreez furnizorul Transfer Multisort Elektronik...');
    await db.execute(`
      INSERT INTO Supplier (name, email, phone, active, createdAt, updatedAt)
      VALUES ('Transfer Multisort Elektronik', 'info@tme.eu', '', 1, datetime('now'), datetime('now'))
    `);
    const newSupplier = await db.execute(`SELECT id FROM Supplier WHERE name = 'Transfer Multisort Elektronik'`);
    tmeId = newSupplier.rows[0].id;
    console.log('Furnizor creat cu ID:', tmeId);
  } else {
    tmeId = suppliers.rows[0].id;
    console.log('\nFurnizor existent cu ID:', tmeId);
  }

  // Asociază produsele non-Sauter (exclus cele deja asociate cu MLC - Seria PA)
  const mlcProducts = await db.execute(`SELECT productId FROM SupplierProduct WHERE supplierId = 13`);
  const mlcProductIds = mlcProducts.rows.map(r => r.productId);
  console.log('\nProduse deja asociate cu MLC:', mlcProductIds);

  let count = 0;
  for (const p of prods.rows) {
    if (mlcProductIds.includes(p.id)) {
      console.log(`  Skip ${p.name} - deja asociat cu MLC`);
      continue;
    }
    
    // Verifică dacă nu e deja asociat cu TME
    const exists = await db.execute(`SELECT 1 FROM SupplierProduct WHERE supplierId = ? AND productId = ?`, [tmeId, p.id]);
    if (exists.rows.length > 0) {
      console.log(`  Skip ${p.name} - deja asociat cu TME`);
      continue;
    }

    // Adaugă asocierea
    await db.execute(`
      INSERT INTO SupplierProduct (supplierId, productId, supplierCode, supplierPrice, currency, minQuantity, lastUpdated)
      VALUES (?, ?, ?, ?, 'EUR', 1, datetime('now'))
    `, [tmeId, p.id, p.sku, p.purchasePrice || 0]);
    console.log(`  ✓ Asociat: ${p.name} cu TME`);
    count++;
  }

  console.log(`\n✅ Total produse asociate cu TME: ${count}`);
}

main().catch(console.error);
