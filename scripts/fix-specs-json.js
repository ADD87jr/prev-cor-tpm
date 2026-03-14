/**
 * Convertește specificațiile și avantajele din text în JSON valid
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function fixSpecs() {
  console.log('🔧 Convertire specs/advantages din text în JSON...\n');
  
  // Obține toate produsele cu specs care nu sunt JSON valid
  const products = await db.execute(`
    SELECT id, sku, specs, specsEn, advantages, advantagesEn 
    FROM Product 
    WHERE specs IS NOT NULL OR advantages IS NOT NULL
  `);
  
  console.log(`📦 Găsite ${products.rows.length} produse cu specs/advantages\n`);
  
  let fixed = 0;
  for (const p of products.rows) {
    let needsUpdate = false;
    let newSpecs = p.specs;
    let newSpecsEn = p.specsEn;
    let newAdvantages = p.advantages;
    let newAdvantagesEn = p.advantagesEn;
    
    // Verifică dacă specs e text și convertește în JSON array
    if (p.specs && typeof p.specs === 'string' && !p.specs.startsWith('[') && !p.specs.startsWith('{')) {
      const lines = p.specs.split('\n').filter(l => l.trim());
      newSpecs = JSON.stringify(lines);
      needsUpdate = true;
    }
    
    if (p.specsEn && typeof p.specsEn === 'string' && !p.specsEn.startsWith('[') && !p.specsEn.startsWith('{')) {
      const lines = p.specsEn.split('\n').filter(l => l.trim());
      newSpecsEn = JSON.stringify(lines);
      needsUpdate = true;
    }
    
    if (p.advantages && typeof p.advantages === 'string' && !p.advantages.startsWith('[') && !p.advantages.startsWith('{')) {
      const lines = p.advantages.split('\n').filter(l => l.trim());
      newAdvantages = JSON.stringify(lines);
      needsUpdate = true;
    }
    
    if (p.advantagesEn && typeof p.advantagesEn === 'string' && !p.advantagesEn.startsWith('[') && !p.advantagesEn.startsWith('{')) {
      const lines = p.advantagesEn.split('\n').filter(l => l.trim());
      newAdvantagesEn = JSON.stringify(lines);
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await db.execute({
        sql: `UPDATE Product SET specs = ?, specsEn = ?, advantages = ?, advantagesEn = ? WHERE id = ?`,
        args: [newSpecs, newSpecsEn, newAdvantages, newAdvantagesEn, p.id]
      });
      fixed++;
    }
  }
  
  console.log(`✅ Convertite ${fixed} produse\n`);
  
  // Verificare
  const check = await db.execute(`
    SELECT sku, specs, advantages FROM Product 
    WHERE manufacturer = 'Sauter' AND type = 'Spare Parts' 
    LIMIT 2
  `);
  
  console.log('📋 Verificare (format JSON):');
  check.rows.forEach(p => {
    console.log(`\n${p.sku}:`);
    console.log(`  specs: ${p.specs}`);
    console.log(`  advantages: ${p.advantages}`);
  });
}

fixSpecs().then(() => console.log('\n✨ Done!'));
