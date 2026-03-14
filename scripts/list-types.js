require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function listTypes() {
  // Tipuri Siemens
  const siemens = await db.execute(`
    SELECT DISTINCT type, COUNT(*) as cnt 
    FROM Product 
    WHERE manufacturer = 'Siemens'
    GROUP BY type
    ORDER BY type
  `);
  
  console.log('=== Tipuri produse Siemens ===\n');
  siemens.rows.forEach(row => {
    console.log(`${row.type} (${row.cnt} produse)`);
  });
}

listTypes();
