require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const SIEMENS_SUPPLIER_ID = 14;
const DELIVERY_DAYS = 21; // 3 săptămâni pentru Siemens

async function addSupplierProducts() {
  console.log('=== Adăugare SupplierProduct pentru produse SYNCO ===\n');
  
  // Găsește toate produsele SYNCO
  const syncoProducts = await db.execute(`
    SELECT id, sku, price FROM Product 
    WHERE sku LIKE 'RLU%' OR sku LIKE 'RMU%' OR sku LIKE 'RMK%' OR 
          sku LIKE 'RMB%' OR sku LIKE 'RMS%' OR sku LIKE 'RMZ%' OR 
          sku LIKE 'RMH%' OR sku LIKE 'SEZ%' OR sku LIKE 'SEA%' OR 
          sku LIKE 'SEM%' OR sku LIKE 'ARG%' OR sku LIKE 'BAU%' OR 
          sku LIKE 'EM1%' OR sku LIKE 'RLE%'
    ORDER BY sku
  `);
  
  console.log(`Găsite ${syncoProducts.rows.length} produse SYNCO\n`);
  
  let created = 0;
  let skipped = 0;
  
  for (const product of syncoProducts.rows) {
    // Verifică dacă există deja o înregistrare SupplierProduct
    const existing = await db.execute({
      sql: 'SELECT id FROM SupplierProduct WHERE productId = ? AND supplierId = ?',
      args: [product.id, SIEMENS_SUPPLIER_ID]
    });
    
    if (existing.rows.length > 0) {
      // Actualizează deliveryDays dacă există
      await db.execute({
        sql: 'UPDATE SupplierProduct SET deliveryDays = ? WHERE productId = ? AND supplierId = ?',
        args: [DELIVERY_DAYS, product.id, SIEMENS_SUPPLIER_ID]
      });
      console.log(`✓ ${product.sku} - actualizat deliveryDays`);
      skipped++;
      continue;
    }
    
    // Calculează prețul de achiziție (65% din prețul de vânzare)
    const purchasePrice = product.price ? (product.price * 0.65).toFixed(2) : null;
    
    // Creează înregistrarea SupplierProduct
    await db.execute({
      sql: `INSERT INTO SupplierProduct (
        productId, supplierId, supplierCode, supplierPrice, deliveryDays, 
        minQuantity, lastUpdated
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        product.id,
        SIEMENS_SUPPLIER_ID,
        product.sku, // SKU-ul furnizorului e același
        purchasePrice,
        DELIVERY_DAYS,
        1  // minQuantity = 1
      ]
    });
    
    console.log(`✅ ${product.sku} - creat SupplierProduct (deliveryDays: ${DELIVERY_DAYS})`);
    created++;
  }
  
  console.log(`\n=== REZUMAT ===`);
  console.log(`Create noi: ${created}`);
  console.log(`Actualizate: ${skipped}`);
  console.log(`Termen livrare: ${DELIVERY_DAYS} zile`);
}

// Adaugă și pentru celelalte produse Siemens (PXC, DXR, etc.)
async function addSupplierProductsForExistingSiemens() {
  console.log('\n=== Verificare produse Siemens existente ===\n');
  
  const siemensProducts = await db.execute(`
    SELECT p.id, p.sku, p.price 
    FROM Product p 
    LEFT JOIN SupplierProduct sp ON p.id = sp.productId AND sp.supplierId = ${SIEMENS_SUPPLIER_ID}
    WHERE (p.sku LIKE 'PXC%' OR p.sku LIKE 'DXR%' OR p.sku LIKE 'TXM%' OR 
           p.sku LIKE 'TXA%' OR p.sku LIKE 'TXS%' OR p.sku LIKE 'CXG%' OR
           p.sku LIKE 'DXA%' OR p.sku LIKE 'HLB%' OR p.sku LIKE 'QMX%' OR
           p.sku LIKE 'QVE%' OR p.sku LIKE 'RXZ%')
    AND sp.id IS NULL
  `);
  
  console.log(`Găsite ${siemensProducts.rows.length} produse Siemens fără furnizor\n`);
  
  let created = 0;
  
  for (const product of siemensProducts.rows) {
    const purchasePrice = product.price ? (product.price * 0.65).toFixed(2) : null;
    
    await db.execute({
      sql: `INSERT INTO SupplierProduct (
        productId, supplierId, supplierCode, supplierPrice, deliveryDays, 
        minQuantity, lastUpdated
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        product.id,
        SIEMENS_SUPPLIER_ID,
        product.sku,
        purchasePrice,
        DELIVERY_DAYS,
        1
      ]
    });
    
    console.log(`✅ ${product.sku} - creat SupplierProduct`);
    created++;
  }
  
  console.log(`\nCreate pentru Siemens existente: ${created}`);
}

async function main() {
  try {
    await addSupplierProducts();
    await addSupplierProductsForExistingSiemens();
    console.log('\n✅ Toate operațiunile completate!');
  } catch (error) {
    console.error('Eroare:', error);
  } finally {
    process.exit(0);
  }
}

main();
