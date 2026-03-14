/**
 * Script pentru actualizarea prețurilor produselor Sauter
 * conform regulilor de discount din contractul Sauter
 * 
 * Reguli de discount pentru purchasePrice (preț achiziție):
 * - Components (0x, excl. Sauter Specific 09): EPL - 55% → purchasePrice = listPrice * 0.45
 * - Sauter Specific Products (09): EPL - 60% → purchasePrice = listPrice * 0.40
 * - Systems (52): EPL - 55% → purchasePrice = listPrice * 0.45
 * - Spare Parts (P..., numeric 10 cifre, Gasket, etc): Net prices → purchasePrice = listPrice
 * 
 * Preț vânzare: price = listPrice * 0.90 (10% discount față de listPrice)
 * Discount afișat: 10% pentru toate produsele Sauter
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

function determineCategory(product) {
  const sku = (product.sku || '').toUpperCase().trim();
  const name = (product.name || '').toLowerCase();
  const type = (product.type || '').toLowerCase();
  
  // SPARE PARTS - Net prices (PP = LP)
  // - Type conține "spare" sau "parts" sau "piese"
  // - SKU începe cu P și are cifre (P100003500, P200047102S)
  // - Conține Gasket, Seal, O-Ring în nume
  if (type.includes('spare') || type.includes('parts') || type.includes('piese') ||
      /^P\d/.test(sku) || 
      name.includes('gasket') || name.includes('seal') || name.includes('o-ring')) {
    return { category: 'SPARE_PARTS', discountRate: 0 };
  }
  
  // Sauter Specific Products (09) - 60% discount pe EPL
  if (sku.startsWith('09')) {
    return { category: 'SAUTER_SPECIFIC_09', discountRate: 0.60 };
  }
  
  // Systems (52) - 55% discount
  if (sku.startsWith('52')) {
    return { category: 'SYSTEMS_52', discountRate: 0.55 };
  }
  
  // Components (00, 02, 03, 04, 05) - 55%
  if (sku.startsWith('00') || sku.startsWith('02') || sku.startsWith('03') || 
      sku.startsWith('04') || sku.startsWith('05')) {
    return { category: 'COMPONENTS', discountRate: 0.55 };
  }
  
  // Default pentru alte produse Sauter - 55%
  return { category: 'OTHER', discountRate: 0.55 };
}

async function updateSauterPrices() {
  console.log('🔄 Actualizare prețuri produse Sauter conform contract...\n');
  
  // Obține toate produsele Sauter cu listPrice
  const result = await db.execute(`
    SELECT id, name, sku, type, domain, listPrice, price, purchasePrice, discount, discountType
    FROM Product 
    WHERE manufacturer = 'Sauter' AND listPrice IS NOT NULL AND listPrice > 0
  `);
  
  console.log(`📦 Găsite ${result.rows.length} produse Sauter cu preț de listă\n`);
  
  const stats = { SPARE_PARTS: 0, SAUTER_SPECIFIC_09: 0, SYSTEMS_52: 0, COMPONENTS: 0, OTHER: 0 };
  let updated = 0;
  let errors = 0;
  
  for (let i = 0; i < result.rows.length; i++) {
    const product = result.rows[i];
    const listPrice = parseFloat(product.listPrice);
    
    if (isNaN(listPrice) || listPrice <= 0) {
      continue;
    }
    
    const { category, discountRate } = determineCategory(product);
    stats[category]++;
    
    // Calculează purchasePrice (preț achiziție)
    const purchasePrice = Math.round(listPrice * (1 - discountRate) * 100) / 100;
    
    // Prețul de vânzare = listPrice - 10%
    const price = Math.round(listPrice * 0.90 * 100) / 100;
    
    try {
      await db.execute({
        sql: `UPDATE Product SET purchasePrice = ?, price = ?, discount = 10, discountType = 'percent' WHERE id = ?`,
        args: [purchasePrice, price, product.id]
      });
      updated++;
      
      // Afișează progres
      if (updated % 200 === 0) {
        console.log(`  ... ${updated} actualizate`);
      }
    } catch (err) {
      errors++;
      console.log(`❌ Eroare ID ${product.id}: ${err.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 STATISTICI PE CATEGORII:');
  console.log('='.repeat(70));
  console.log(`   Spare Parts (Net prices):       ${stats.SPARE_PARTS.toString().padStart(4)} produse`);
  console.log(`   Sauter Specific 09 (EPL - 60%): ${stats.SAUTER_SPECIFIC_09.toString().padStart(4)} produse`);
  console.log(`   Systems 52 (EPL - 55%):         ${stats.SYSTEMS_52.toString().padStart(4)} produse`);
  console.log(`   Components (EPL - 55%):         ${stats.COMPONENTS.toString().padStart(4)} produse`);
  console.log(`   Other (EPL - 55% default):      ${stats.OTHER.toString().padStart(4)} produse`);
  console.log('='.repeat(70));
  console.log(`✅ Total actualizate: ${updated} produse`);
  if (errors > 0) console.log(`❌ Erori: ${errors}`);
  console.log('='.repeat(70));
  
  // Verificare finală
  console.log('\n📋 Verificare - exemple din fiecare categorie:');
  
  // Spare Parts
  const exSpare = await db.execute(`SELECT sku, listPrice, purchasePrice FROM Product WHERE manufacturer = 'Sauter' AND sku LIKE 'P1000%' LIMIT 3`);
  console.log('\n  SPARE PARTS (Net prices - PP = LP):');
  exSpare.rows.forEach(p => {
    const isNet = p.listPrice === p.purchasePrice ? '✅ NET' : '❌ cu discount';
    console.log(`    ${p.sku.padEnd(15)} LP: ${p.listPrice} → PP: ${p.purchasePrice} ${isNet}`);
  });
  
  // Sauter Specific 09
  const ex09 = await db.execute(`SELECT sku, listPrice, purchasePrice FROM Product WHERE manufacturer = 'Sauter' AND sku LIKE '09%' LIMIT 2`);
  console.log('\n  SAUTER SPECIFIC (09 - 60% off):');
  ex09.rows.forEach(p => {
    const discSaved = ((p.listPrice - p.purchasePrice) / p.listPrice * 100).toFixed(0);
    console.log(`    ${p.sku.padEnd(15)} LP: ${p.listPrice} → PP: ${p.purchasePrice} (${discSaved}% off)`);
  });
  
  // Components
  const exComp = await db.execute(`SELECT sku, listPrice, purchasePrice FROM Product WHERE manufacturer = 'Sauter' AND sku LIKE '03%' LIMIT 2`);
  console.log('\n  COMPONENTS (03 - 55% off):');
  exComp.rows.forEach(p => {
    const discSaved = ((p.listPrice - p.purchasePrice) / p.listPrice * 100).toFixed(0);
    console.log(`    ${p.sku.padEnd(15)} LP: ${p.listPrice} → PP: ${p.purchasePrice} (${discSaved}% off)`);
  });
}

updateSauterPrices()
  .then(() => {
    console.log('\n✨ Script finalizat cu succes!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Eroare:', err);
    process.exit(1);
  });
