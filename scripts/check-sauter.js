require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function check() {
  try {
    // Total produse Sauter
    const count = await db.execute('SELECT COUNT(*) as cnt FROM Product WHERE manufacturer = "Sauter"');
    console.log('Total produse Sauter:', count.rows[0].cnt);
    
    // Verifică produse care au SKU numeric (00xxxxx - spare parts)
    console.log('\n📦 Produse cu SKU numeric lung (posibil Spare Parts):');
    const numericSku = await db.execute(`
      SELECT sku, name, listPrice, purchasePrice, type
      FROM Product 
      WHERE manufacturer = 'Sauter' 
        AND sku GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'
      LIMIT 10
    `);
    numericSku.rows.forEach(p => {
      const discPct = p.listPrice > 0 ? ((p.listPrice - p.purchasePrice) / p.listPrice * 100).toFixed(0) : 0;
      console.log(`  ${(p.sku||'N/A').padEnd(15)} LP:${p.listPrice} PP:${p.purchasePrice} (${discPct}% off) | Type: ${p.type}`);
    });
    
    // Verifică produse cu Type = 'Components' care par Spare Parts
    console.log('\n📦 Verificare tipuri distincte:');
    const types = await db.execute(`
      SELECT type, COUNT(*) as cnt 
      FROM Product 
      WHERE manufacturer = 'Sauter' 
      GROUP BY type 
      ORDER BY cnt DESC
      LIMIT 10
    `);
    types.rows.forEach(t => console.log(`  ${(t.type||'N/A').padEnd(20)} - ${t.cnt} produse`));
    
    // Prețuri net (spare parts importate)
    console.log('\n📦 Produse din importul EPL (SKU-uri EPL style):');
    const eplProducts = await db.execute(`
      SELECT sku, name, listPrice, purchasePrice
      FROM Product 
      WHERE manufacturer = 'Sauter' 
        AND (sku LIKE 'P%' OR sku LIKE 'V%' OR sku LIKE 'BEFUND%' OR LENGTH(sku) <= 12)
      LIMIT 10
    `);
    eplProducts.rows.forEach(p => {
      console.log(`  ${(p.sku||'N/A').padEnd(15)} - ${p.name.substring(0,40)}`);
    });
    
  } catch (err) {
    console.error('Eroare:', err.message);
  }
}

check();
