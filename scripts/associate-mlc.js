require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function associateMLC() {
  console.log('🔧 Asociere produse non-Sauter cu MLC Power Automation (id=13)...\n');
  
  // Actualizează supplierId pentru produsele non-Sauter
  const r1 = await db.execute(`
    UPDATE Product 
    SET supplierId = 13 
    WHERE manufacturer IS NULL OR manufacturer != 'Sauter'
  `);
  console.log(`✅ Actualizate ${r1.rowsAffected} produse cu supplierId=13`);
  
  // Obține produsele pentru SupplierProduct
  const products = await db.execute(`
    SELECT id, sku, purchasePrice, listPrice, price 
    FROM Product 
    WHERE manufacturer IS NULL OR manufacturer != 'Sauter'
  `);
  
  // Inserează în SupplierProduct
  for (const p of products.rows) {
    const supplierPrice = p.purchasePrice || p.listPrice || p.price || 0;
    
    // Verifică dacă există deja
    const exists = await db.execute({
      sql: `SELECT id FROM SupplierProduct WHERE supplierId = 13 AND productId = ?`,
      args: [p.id]
    });
    
    if (exists.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO SupplierProduct (supplierId, productId, supplierCode, supplierPrice, currency, minQuantity, deliveryDays, lastUpdated) 
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [13, p.id, p.sku, supplierPrice, 'EUR', 1, 14]
      });
      console.log(`  + Adăugat ${p.sku} la MLC Power Automation`);
    }
  }
  
  // Verificare
  const check = await db.execute(`
    SELECT s.name, COUNT(sp.id) as products
    FROM Supplier s
    LEFT JOIN SupplierProduct sp ON sp.supplierId = s.id
    GROUP BY s.id, s.name
    HAVING products > 0
    ORDER BY products DESC
  `);
  
  console.log('\n📊 Furnizori cu produse:');
  check.rows.forEach(r => {
    console.log(`  ${r.name.padEnd(40)} - ${r.products} produse`);
  });
}

associateMLC().then(() => console.log('\n✨ Done!'));
