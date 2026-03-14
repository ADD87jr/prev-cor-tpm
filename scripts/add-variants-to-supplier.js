require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function addVariantsToSupplier() {
  console.log('🔧 Adăugare variante în SupplierProduct...\n');
  
  // Găsește produsul Seria PA
  const p = await db.execute(`SELECT id FROM Product WHERE sku = 'Seria PA'`);
  const productId = p.rows[0]?.id;
  
  if (!productId) {
    console.log('Produsul Seria PA nu a fost găsit!');
    return;
  }
  
  // Obține variantele
  const variants = await db.execute(`SELECT id, code, pret, purchasePrice FROM ProductVariant WHERE productId = ${productId}`);
  console.log(`📦 Găsite ${variants.rows.length} variante pentru Seria PA\n`);
  
  // Adaugă fiecare variantă în SupplierProduct
  for (const v of variants.rows) {
    // Verifică dacă există deja
    const exists = await db.execute({
      sql: `SELECT id FROM SupplierProduct WHERE supplierId = 13 AND productId = ? AND variantId = ?`,
      args: [productId, v.id]
    });
    
    if (exists.rows.length === 0) {
      const supplierPrice = v.purchasePrice || v.pret || 0;
      await db.execute({
        sql: `INSERT INTO SupplierProduct (supplierId, productId, variantId, supplierCode, supplierPrice, currency, minQuantity, deliveryDays, lastUpdated) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [13, productId, v.id, v.code, supplierPrice, 'EUR', 1, 14]
      });
      console.log(`  + Adăugată varianta ${v.code || v.id}: ${supplierPrice} EUR`);
    } else {
      console.log(`  ✓ Varianta ${v.code || v.id} deja există`);
    }
  }
  
  // Verificare
  const check = await db.execute(`
    SELECT sp.id, sp.supplierCode, sp.supplierPrice, sp.variantId, pv.code as varCode
    FROM SupplierProduct sp
    LEFT JOIN ProductVariant pv ON pv.id = sp.variantId
    WHERE sp.supplierId = 13
  `);
  
  console.log('\n📊 SupplierProduct pentru MLC:');
  check.rows.forEach(r => {
    const varInfo = r.variantId ? `(varianta ${r.variantId}: ${r.varCode})` : '(produs principal)';
    console.log(`  ${r.supplierCode || 'N/A'}: ${r.supplierPrice} EUR ${varInfo}`);
  });
}

addVariantsToSupplier().then(() => console.log('\n✨ Done!'));
