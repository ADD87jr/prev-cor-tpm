// Script pentru re-numerotarea ID-urilor produselor (1, 2, 3, ...)
// ATENȚIE: Operație riscantă! Fă backup înainte!

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Tabele care conțin productId și trebuie actualizate
const RELATED_TABLES = [
  { table: 'SupplierProduct', column: 'productId' },
  { table: 'OrderItem', column: 'productId' },
  { table: 'CartItem', column: 'productId' },
  { table: 'WishlistItem', column: 'productId' },
  { table: 'Review', column: 'productId' },
  { table: 'ProductImage', column: 'productId' },
  { table: 'ProductVariant', column: 'productId' },
  { table: 'QuoteItem', column: 'productId' },
  { table: 'ImportProduct', column: 'productId' },
  { table: 'ImportItem', column: 'productId' },
];

async function reindexProducts() {
  console.log('=== RE-INDEXARE ID-URI PRODUSE ===\n');
  
  // 1. Verifică dacă există comenzi/reviews (avertisment)
  try {
    const orders = await db.execute('SELECT COUNT(*) as cnt FROM OrderItem');
    if (orders.rows[0].cnt > 0) {
      console.log(`⚠️  ATENȚIE: Există ${orders.rows[0].cnt} produse în comenzi!`);
    }
  } catch (e) { /* tabel nu există */ }
  
  try {
    const reviews = await db.execute('SELECT COUNT(*) as cnt FROM Review');
    if (reviews.rows[0].cnt > 0) {
      console.log(`⚠️  ATENȚIE: Există ${reviews.rows[0].cnt} review-uri!`);
    }
  } catch (e) { /* tabel nu există */ }
  
  // 2. Ia toate produsele ordonate după ID
  const products = await db.execute('SELECT id FROM Product ORDER BY id ASC');
  console.log(`\n📦 Total produse: ${products.rows.length}`);
  
  if (products.rows.length === 0) {
    console.log('❌ Nu există produse!');
    return;
  }
  
  // 3. Creează mapping oldId -> newId
  const mapping = {};
  products.rows.forEach((p, index) => {
    const oldId = p.id;
    const newId = index + 1;
    if (oldId !== newId) {
      mapping[oldId] = newId;
    }
  });
  
  const changesCount = Object.keys(mapping).length;
  console.log(`🔄 Produse care necesită re-indexare: ${changesCount}`);
  
  if (changesCount === 0) {
    console.log('✅ ID-urile sunt deja consecutive! Nu e nevoie de re-indexare.');
    return;
  }
  
  // Afișează primele 10 schimbări
  console.log('\n📋 Exemple de schimbări:');
  Object.entries(mapping).slice(0, 10).forEach(([oldId, newId]) => {
    console.log(`   ${oldId} → ${newId}`);
  });
  if (changesCount > 10) {
    console.log(`   ... și încă ${changesCount - 10} schimbări`);
  }
  
  // 4. Confirmă
  console.log('\n⚠️  ACEASTĂ OPERAȚIE ESTE IREVERSIBILĂ!');
  console.log('Pentru a continua, rulează: node scripts/reindex-products.js --confirm\n');
  
  if (!process.argv.includes('--confirm')) {
    return;
  }
  
  console.log('🚀 Începe re-indexarea...\n');
  
  try {
    // 5. Dezactivează foreign keys temporar
    await db.execute('PRAGMA foreign_keys = OFF');
    
    // 6. Creează tabel temporar cu noile ID-uri
    await db.execute('DROP TABLE IF EXISTS _product_mapping');
    await db.execute('CREATE TABLE _product_mapping (old_id INTEGER, new_id INTEGER)');
    
    // Inserează mapping-ul
    for (const [oldId, newId] of Object.entries(mapping)) {
      await db.execute({
        sql: 'INSERT INTO _product_mapping (old_id, new_id) VALUES (?, ?)',
        args: [parseInt(oldId), newId]
      });
    }
    
    // 7. Actualizează tabelele relacionate
    for (const { table, column } of RELATED_TABLES) {
      try {
        const result = await db.execute(`
          UPDATE ${table} 
          SET ${column} = (SELECT new_id FROM _product_mapping WHERE old_id = ${table}.${column})
          WHERE ${column} IN (SELECT old_id FROM _product_mapping)
        `);
        if (result.rowsAffected > 0) {
          console.log(`   ✅ ${table}: ${result.rowsAffected} rânduri actualizate`);
        }
      } catch (err) {
        // Tabel nu există sau e gol
        console.log(`   ⏭️  ${table}: skip (${err.message.slice(0, 50)})`);
      }
    }
    
    // 8. Actualizează ID-urile în Product
    // Trebuie să folosim ID-uri temporare negative pentru a evita conflicte
    console.log('\n🔄 Actualizez ID-uri produse (faza 1 - temporar)...');
    for (const [oldId, newId] of Object.entries(mapping)) {
      await db.execute({
        sql: 'UPDATE Product SET id = ? WHERE id = ?',
        args: [-newId, parseInt(oldId)]  // Negativ temporar
      });
    }
    
    console.log('🔄 Actualizez ID-uri produse (faza 2 - final)...');
    for (const newId of Object.values(mapping)) {
      await db.execute({
        sql: 'UPDATE Product SET id = ? WHERE id = ?',
        args: [newId, -newId]  // Din negativ în pozitiv
      });
    }
    
    // 9. Resetează autoincrement
    const maxId = products.rows.length;
    await db.execute(`UPDATE sqlite_sequence SET seq = ${maxId} WHERE name = 'Product'`);
    
    // 10. Curăță
    await db.execute('DROP TABLE _product_mapping');
    await db.execute('PRAGMA foreign_keys = ON');
    
    console.log(`\n✅ Re-indexare completă! ID-uri acum: 1-${maxId}`);
    
    // 11. Redenumește folderele de imagini
    console.log('\n📁 Redenumesc folderele de imagini...');
    const imagesDir = path.join(__dirname, '..', 'public', 'products');
    
    if (fs.existsSync(imagesDir)) {
      // Prima trecere: redenumește în temporar
      for (const [oldId, newId] of Object.entries(mapping)) {
        const oldPath = path.join(imagesDir, oldId);
        const tempPath = path.join(imagesDir, `_temp_${newId}`);
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, tempPath);
        }
      }
      
      // A doua trecere: din temporar în final
      for (const newId of Object.values(mapping)) {
        const tempPath = path.join(imagesDir, `_temp_${newId}`);
        const newPath = path.join(imagesDir, String(newId));
        if (fs.existsSync(tempPath)) {
          if (fs.existsSync(newPath)) {
            // Dacă există deja, șterge temporarul (nu ar trebui să se întâmple)
            fs.rmSync(tempPath, { recursive: true });
          } else {
            fs.renameSync(tempPath, newPath);
            console.log(`   📁 ${tempPath} → ${newPath}`);
          }
        }
      }
      console.log('✅ Foldere de imagini actualizate!');
    }
    
    console.log('\n🎉 FINALIZAT! Repornește serverul pentru a vedea modificările.');
    
  } catch (error) {
    console.error('❌ EROARE:', error);
    await db.execute('PRAGMA foreign_keys = ON');
  }
}

reindexProducts();
