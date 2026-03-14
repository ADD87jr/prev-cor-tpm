require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function fixDoubleSpaces() {
  // Corectează spații duble în nume
  const names = await db.execute(`SELECT id, name FROM Product WHERE name LIKE '%  %'`);
  console.log(`Găsite ${names.rows.length} produse cu spații duble în nume`);
  
  for (const product of names.rows) {
    const newName = product.name.replace(/  +/g, ' ');
    await db.execute({
      sql: 'UPDATE Product SET name = ? WHERE id = ?',
      args: [newName, product.id]
    });
  }
  
  // Corectează spații duble în descrieri
  const descriptions = await db.execute(`SELECT id, description FROM Product WHERE description LIKE '%  %'`);
  console.log(`Găsite ${descriptions.rows.length} produse cu spații duble în descriere`);
  
  for (const product of descriptions.rows) {
    const newDesc = product.description.replace(/  +/g, ' ');
    await db.execute({
      sql: 'UPDATE Product SET description = ? WHERE id = ?',
      args: [newDesc, product.id]
    });
  }
  
  console.log(`\n✅ Corectate ${names.rows.length + descriptions.rows.length} produse`);
  process.exit(0);
}

fixDoubleSpaces();
