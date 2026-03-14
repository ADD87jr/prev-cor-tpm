require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function check() {
  // Count products without image
  const noImage = await db.execute(`
    SELECT COUNT(*) as cnt FROM Product 
    WHERE image IS NULL OR image = ''
  `);
  console.log('Produse fără imagine (NULL sau empty):', noImage.rows[0].cnt);

  // Count with placeholder
  const placeholder = await db.execute(`
    SELECT COUNT(*) as cnt FROM Product 
    WHERE image LIKE '%placeholder%' OR image LIKE '%no-image%'
  `);
  console.log('Produse cu placeholder/no-image:', placeholder.rows[0].cnt);

  // Show placeholder images
  const placeholderSamples = await db.execute(`
    SELECT DISTINCT image FROM Product 
    WHERE image LIKE '%placeholder%' OR image LIKE '%no-image%'
    LIMIT 5
  `);
  console.log('\nTipuri de imagini placeholder:');
  placeholderSamples.rows.forEach(p => console.log('-', p.image));

  // Count with actual images
  const withImage = await db.execute(`
    SELECT COUNT(*) as cnt FROM Product 
    WHERE image IS NOT NULL AND image != '' 
    AND image NOT LIKE '%placeholder%' AND image NOT LIKE '%no-image%'
  `);
  console.log('\nProduse cu imagine reală:', withImage.rows[0].cnt);

  // Total
  const total = await db.execute(`SELECT COUNT(*) as cnt FROM Product`);
  console.log('Total produse:', total.rows[0].cnt);

  // Sample some with images
  const sample = await db.execute(`
    SELECT id, name, image FROM Product 
    WHERE image IS NOT NULL AND image != '' 
    LIMIT 5
  `);
  console.log('\nExemple produse cu imagine:');
  sample.rows.forEach(p => console.log('ID:', p.id, '| Image:', p.image?.substring(0, 50)));
}

check().catch(console.error);
