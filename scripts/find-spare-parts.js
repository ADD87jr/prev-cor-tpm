require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function findSpareParts() {
  console.log('🔍 Căutare produse din importul EPL Spare Parts...\n');
  
  // Caută produse cu SKU-uri din Excel-ul EPL (P..., VUS..., BEFUND..., GZS...)
  const eplProducts = await db.execute(`
    SELECT sku, name, listPrice, purchasePrice, type, manufacturer
    FROM Product 
    WHERE sku LIKE 'P%' 
       OR sku LIKE 'BEFUND%' 
       OR sku LIKE 'VUS%' 
       OR sku LIKE 'GZS%'
       OR (sku GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]' AND LENGTH(sku) = 10)
    LIMIT 20
  `);
  
  console.log('Produse găsite:', eplProducts.rows.length);
  console.log('');
  
  eplProducts.rows.forEach(p => {
    const discPct = p.listPrice > 0 ? ((p.listPrice - p.purchasePrice) / p.listPrice * 100).toFixed(0) : 0;
    const isNet = p.listPrice === p.purchasePrice ? '✅ NET' : `❌ ${discPct}% off`;
    console.log(`${(p.sku || 'N/A').padEnd(15)} | LP: ${String(p.listPrice).padStart(8)} | PP: ${String(p.purchasePrice).padStart(8)} | ${isNet}`);
  });
  
  // Verifică numeric SKU-uri (0034022000 etc din EPL)
  console.log('\n📋 Produse cu SKU numeric 10 cifre (din EPL Spare Parts):');
  const numericSku = await db.execute(`
    SELECT sku, name, listPrice, purchasePrice
    FROM Product 
    WHERE sku GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
    LIMIT 10
  `);
  
  numericSku.rows.forEach(p => {
    const isNet = p.listPrice === p.purchasePrice ? '✅ NET' : '❌ cu discount';
    console.log(`  ${p.sku} - ${p.name.substring(0, 30)} | ${isNet}`);
  });
}

findSpareParts().catch(console.error);
