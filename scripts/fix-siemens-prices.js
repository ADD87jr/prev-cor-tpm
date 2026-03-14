require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Discounturi Siemens:
// - Preț de intrare = Preț listă - 20%
// - Preț de vânzare = Preț listă - 10%

async function updateSiemensProducts() {
  console.log('=== Actualizare completă produse Siemens ===\n');
  
  // Găsește toate produsele Siemens
  const result = await db.execute(`
    SELECT id, sku, name, price, listPrice, purchasePrice, type, deliveryTime, image
    FROM Product 
    WHERE manufacturer = 'Siemens'
    ORDER BY sku
  `);
  
  console.log(`Găsite ${result.rows.length} produse Siemens\n`);
  
  let updated = 0;
  
  for (const product of result.rows) {
    const listPrice = product.listPrice || product.price || 0;
    
    // Prețul de intrare = Preț listă - 20%
    const purchasePrice = Math.round(listPrice * 0.80 * 100) / 100;
    
    // Prețul de vânzare = Preț listă - 10%
    const salePrice = Math.round(listPrice * 0.90 * 100) / 100;
    
    // Setează termenul de livrare
    const deliveryTime = '7-10 zile';
    const deliveryTimeEn = '7-10 days';
    
    // Determină tipul de produs bazat pe prefix
    const sku = product.sku;
    let productType = product.type;
    
    if (!productType || productType === 'Automatizări clădiri') {
      if (sku.startsWith('PXC') || sku.startsWith('DXR')) {
        productType = 'Controller automatizare clădiri';
      } else if (sku.startsWith('TXM') || sku.startsWith('TXA') || sku.startsWith('TXS')) {
        productType = 'Modul I/O';
      } else if (sku.startsWith('CXG')) {
        productType = 'Gateway comunicație';
      } else if (sku.startsWith('RLU') || sku.startsWith('RMU') || sku.startsWith('RMK')) {
        productType = 'Controller universal HVAC';
      } else if (sku.startsWith('RMZ') || sku.startsWith('RMH') || sku.startsWith('EM1')) {
        productType = 'Modul extensie';
      } else if (sku.startsWith('SEZ') || sku.startsWith('SEA') || sku.startsWith('SEM')) {
        productType = 'Actuator/Servomotor';
      } else if (sku.startsWith('QMX') || sku.startsWith('QVE')) {
        productType = 'Senzor';
      } else if (sku.startsWith('OCI') || sku.startsWith('OZW')) {
        productType = 'Interfață comunicație';
      } else if (sku.startsWith('DXA')) {
        productType = 'Accesoriu';
      } else if (sku.startsWith('HLB')) {
        productType = 'Regulator VAV';
      } else if (sku.startsWith('CTX')) {
        productType = 'Licență software';
      } else if (sku.startsWith('RXZ')) {
        productType = 'Modul comunicație';
      } else if (sku.startsWith('BAU')) {
        productType = 'Display';
      } else if (sku.startsWith('ARG')) {
        productType = 'Accesoriu montaj';
      } else if (sku.startsWith('RLE')) {
        productType = 'Controller temperatură';
      } else if (sku.startsWith('RMB') || sku.startsWith('RMS')) {
        productType = 'Unitate control centrală';
      } else {
        productType = 'Echipament automatizare';
      }
    }
    
    // Actualizează produsul
    await db.execute({
      sql: `UPDATE Product SET 
        purchasePrice = ?,
        price = ?,
        deliveryTime = ?,
        deliveryTimeEn = ?,
        type = ?
      WHERE id = ?`,
      args: [purchasePrice, salePrice, deliveryTime, deliveryTimeEn, productType, product.id]
    });
    
    console.log(`✅ ${product.sku}: listă=${listPrice}€, intrare=${purchasePrice}€, vânzare=${salePrice}€, tip=${productType}`);
    updated++;
  }
  
  console.log(`\n=== REZUMAT ===`);
  console.log(`Actualizate: ${updated} produse`);
  console.log(`Discount furnizor: 20% (preț intrare = listă × 0.80)`);
  console.log(`Discount client: 10% (preț vânzare = listă × 0.90)`);
}

async function main() {
  try {
    await updateSiemensProducts();
    console.log('\n✅ Toate operațiunile completate!');
  } catch (error) {
    console.error('Eroare:', error);
  } finally {
    process.exit(0);
  }
}

main();
