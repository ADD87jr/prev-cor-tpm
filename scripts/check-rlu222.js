require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Verifică RLU222 complet
async function checkProduct() {
  const result = await db.execute(`
    SELECT * FROM Product WHERE sku = 'RLU222'
  `);
  
  const p = result.rows[0];
  console.log('=== RLU222 - Date complete ===\n');
  console.log('Preț vânzare:', p.price);
  console.log('Preț de listă:', p.listPrice);
  console.log('Preț de intrare:', p.purchasePrice);
  console.log('Discount:', p.discount);
  console.log('Tip produs:', p.type);
  console.log('Domeniu:', p.domain);
  console.log('Imagine:', p.image);
  console.log('Delivery Time:', p.deliveryTime);
  
  // Verifică dacă imaginea există
  const imagePath = path.join(__dirname, '..', 'public', p.image || '');
  console.log('\nImagine existentă:', fs.existsSync(imagePath) ? 'DA' : 'NU');
  console.log('Cale completă:', imagePath);
  
  // Listează fișierele din directorul siemens
  const siemensDir = path.join(__dirname, '..', 'public', 'products', 'siemens');
  const files = fs.readdirSync(siemensDir).filter(f => f.includes('RLU'));
  console.log('\nFișiere RLU în director:', files);
}

checkProduct().then(() => process.exit(0));
