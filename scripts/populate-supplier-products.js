require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function populateSupplierProducts() {
  console.log('🔧 Completare SupplierProduct pentru Sauter...\n');
  
  // Obține produsele Sauter care nu au încă intrare în SupplierProduct
  const products = await db.execute(`
    SELECT p.id, p.sku, p.purchasePrice, p.listPrice 
    FROM Product p
    LEFT JOIN SupplierProduct sp ON sp.productId = p.id AND sp.supplierId = 15
    WHERE p.manufacturer = 'Sauter' AND sp.id IS NULL
  `);
  
  console.log(`📦 Găsite ${products.rows.length} produse Sauter de adăugat\n`);
  
  if (products.rows.length === 0) {
    console.log('✅ Toate produsele sunt deja în SupplierProduct');
    return;
  }
  
  // Inserează înregistrări în SupplierProduct
  let inserted = 0;
  for (const p of products.rows) {
    const supplierPrice = p.purchasePrice || p.listPrice || 0;
    
    try {
      await db.execute({
        sql: `INSERT INTO SupplierProduct (supplierId, productId, supplierCode, supplierPrice, currency, minQuantity, deliveryDays, lastUpdated) 
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [15, p.id, p.sku, supplierPrice, 'EUR', 1, 10]
      });
      inserted++;
    } catch (e) {
      console.log(`  Skip ${p.sku}: ${e.message}`);
    }
    
    if (inserted % 100 === 0) {
      console.log(`  Inserate ${inserted}/${products.rows.length}...`);
    }
  }
  
  console.log(`\n✅ Inserate ${inserted} înregistrări în SupplierProduct\n`);
  
  // Verificare
  const check = await db.execute(`
    SELECT s.name, COUNT(sp.id) as products
    FROM Supplier s
    LEFT JOIN SupplierProduct sp ON sp.supplierId = s.id
    GROUP BY s.id, s.name
    HAVING products > 0
    ORDER BY products DESC
  `);
  
  console.log('📊 Verificare SupplierProduct:');
  check.rows.forEach(r => {
    console.log(`  ${r.name.padEnd(40)} - ${r.products} produse`);
  });
}

populateSupplierProducts().then(() => console.log('\n✨ Done!'));
