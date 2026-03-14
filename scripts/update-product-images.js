require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const url = process.env.TURSO_DATABASE_URL.replace(/^"|"$/g, '');
const token = process.env.TURSO_AUTH_TOKEN.replace(/^"|"$/g, '');

const db = createClient({ url, authToken: token });

async function updateProductImages() {
  const images = JSON.stringify(['/uploads/IG0094-2.png', '/uploads/IG0094-3.png']);
  
  const result = await db.execute({
    sql: 'UPDATE Product SET image = ?, images = ? WHERE id = 1',
    args: ['/uploads/IG0094-1.png', images]
  });
  
  console.log('Actualizat:', result.rowsAffected, 'rand');
  
  // Verify
  const product = await db.execute('SELECT id, name, image, images FROM Product WHERE id = 1');
  console.log('Produs actualizat:', product.rows[0]);
}

updateProductImages().catch(console.error);
