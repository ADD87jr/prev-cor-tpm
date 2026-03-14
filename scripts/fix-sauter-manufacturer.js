// Script pentru a corecta produsele Sauter importate
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  // 1. Fix manufacturer
  console.log('1. Verificare produse fără manufacturer...');
  const noManuf = await db.execute('SELECT COUNT(*) as cnt FROM Product WHERE manufacturer IS NULL');
  if (noManuf.rows[0].cnt > 0) {
    console.log(`   Setare manufacturer = "Sauter" pentru ${noManuf.rows[0].cnt} produse...`);
    await db.execute("UPDATE Product SET manufacturer = 'Sauter' WHERE manufacturer IS NULL");
    console.log('   ✓ Done');
  } else {
    console.log('   ✓ Toate produsele au manufacturer');
  }
  
  // 2. Fix SKU - copiază din type dacă type arată ca un cod de produs (ex: ADM322F120)
  console.log('\n2. Verificare SKU lipsă...');
  const noSku = await db.execute("SELECT COUNT(*) as cnt FROM Product WHERE manufacturer = 'Sauter' AND sku IS NULL");
  if (noSku.rows[0].cnt > 0) {
    console.log(`   Copiere type -> sku pentru ${noSku.rows[0].cnt} produse...`);
    await db.execute("UPDATE Product SET sku = type, type = 'Components' WHERE manufacturer = 'Sauter' AND sku IS NULL");
    console.log('   ✓ Done');
  } else {
    console.log('   ✓ Toate produsele Sauter au SKU');
  }
  
  // 3. Verificare finală
  console.log('\n3. Verificare finală:');
  const sample = await db.execute("SELECT id, sku, type, name FROM Product WHERE manufacturer = 'Sauter' LIMIT 5");
  console.table(sample.rows);
  
  const stats = await db.execute('SELECT manufacturer, COUNT(*) as cnt FROM Product GROUP BY manufacturer ORDER BY cnt DESC');
  console.log('\nDistribuție producători:');
  console.table(stats.rows);
}

main().catch(console.error);
