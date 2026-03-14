require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkSyncoProducts() {
  console.log('=== Verificare finală produse SYNCO ===\n');
  
  const result = await db.execute(`
    SELECT sku, name, price, discount, type, image, specs, advantages 
    FROM Product 
    WHERE sku LIKE 'RLU%' OR sku LIKE 'RMU%' OR sku LIKE 'RMK%' OR 
          sku LIKE 'RMB%' OR sku LIKE 'RMS%' OR sku LIKE 'RMZ%' OR 
          sku LIKE 'RMH%' OR sku LIKE 'SEZ%' OR sku LIKE 'SEA%' OR 
          sku LIKE 'SEM%' OR sku LIKE 'ARG%' OR sku LIKE 'BAU%' OR 
          sku LIKE 'EM1%' OR sku LIKE 'RLE%'
    ORDER BY sku
  `);
  
  console.log(`Total produse SYNCO: ${result.rows.length}\n`);
  
  let withPrice = 0, withDiscount = 0, withType = 0, withImage = 0, withSpecs = 0, withAdvantages = 0;
  
  result.rows.forEach(p => {
    if (p.price) withPrice++;
    if (p.discount) withDiscount++;
    if (p.type) withType++;
    if (p.image && !p.image.includes('placeholder') && !p.image.includes('default')) withImage++;
    if (p.specs) withSpecs++;
    if (p.advantages) withAdvantages++;
  });
  
  console.log('=== Statistici ===');
  console.log(`Cu preț: ${withPrice}/${result.rows.length}`);
  console.log(`Cu discount: ${withDiscount}/${result.rows.length}`);
  console.log(`Cu tip: ${withType}/${result.rows.length}`);
  console.log(`Cu imagine: ${withImage}/${result.rows.length}`);
  console.log(`Cu specificații: ${withSpecs}/${result.rows.length}`);
  console.log(`Cu avantaje: ${withAdvantages}/${result.rows.length}`);
  
  console.log('\n=== Exemple produse ===\n');
  
  // Afișează câteva exemple
  const examples = ['RLU222', 'RMU710B-1', 'SEZ220', 'EM1.8D'];
  for (const sku of examples) {
    const prod = result.rows.find(p => p.sku === sku);
    if (prod) {
      console.log(`${prod.sku}:`);
      console.log(`  Preț: ${prod.price} EUR`);
      console.log(`  Discount: ${prod.discount}%`);
      console.log(`  Tip: ${prod.type}`);
      console.log(`  Imagine: ${prod.image}`);
      console.log(`  Specificații: ${prod.specs ? 'DA' : 'NU'}`);
      console.log(`  Avantaje: ${prod.advantages ? 'DA' : 'NU'}`);
      console.log('');
    }
  }
  
  process.exit(0);
}

checkSyncoProducts();
