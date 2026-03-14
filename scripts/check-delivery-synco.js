require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkDeliveryDays() {
  // Verifică dacă există SupplierProduct pentru produsele SYNCO
  const result = await db.execute(`
    SELECT p.sku, p.name, sp.deliveryDays, s.name as supplierName
    FROM Product p 
    LEFT JOIN SupplierProduct sp ON p.id = sp.productId
    LEFT JOIN Supplier s ON sp.supplierId = s.id
    WHERE p.sku LIKE 'RLU%' OR p.sku LIKE 'RMU%' OR p.sku LIKE 'RMK%' OR 
          p.sku LIKE 'RMB%' OR p.sku LIKE 'RMS%' OR p.sku LIKE 'RMZ%' OR 
          p.sku LIKE 'RMH%' OR p.sku LIKE 'SEZ%' OR p.sku LIKE 'SEA%' OR 
          p.sku LIKE 'SEM%' OR p.sku LIKE 'ARG%' OR p.sku LIKE 'BAU%' OR 
          p.sku LIKE 'EM1%' OR p.sku LIKE 'RLE%'
    ORDER BY p.sku
  `);
  
  console.log('=== Termen livrare produse SYNCO ===\n');
  
  let withDays = 0;
  let withoutDays = 0;
  let withoutSupplier = 0;
  
  result.rows.forEach(p => {
    if (!p.supplierName) {
      withoutSupplier++;
      console.log(`⚠ ${p.sku} - fără furnizor asociat`);
    } else if (p.deliveryDays) {
      withDays++;
    } else {
      withoutDays++;
      console.log(`⚠ ${p.sku} - furnizor: ${p.supplierName}, fără deliveryDays`);
    }
  });
  
  console.log(`\nCu termen livrare: ${withDays}/${result.rows.length}`);
  console.log(`Fără termen livrare: ${withoutDays}/${result.rows.length}`);
  console.log(`Fără furnizor: ${withoutSupplier}/${result.rows.length}`);
  
  // Verifică și produsele Siemens existente ca referință
  const siemens = await db.execute(`
    SELECT p.sku, sp.deliveryDays, s.name as supplierName
    FROM Product p 
    LEFT JOIN SupplierProduct sp ON p.id = sp.productId
    LEFT JOIN Supplier s ON sp.supplierId = s.id
    WHERE p.sku LIKE 'PXC%' LIMIT 3
  `);
  
  console.log('\n=== Referință produse Siemens existente ===');
  siemens.rows.forEach(p => {
    console.log(`${p.sku} - furnizor: ${p.supplierName || 'N/A'}, deliveryDays: ${p.deliveryDays || 'N/A'}`);
  });
  
  process.exit(0);
}

checkDeliveryDays();
