require('dotenv/config');
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  const result = await client.execute(`
    SELECT DISTINCT image, COUNT(*) as cnt 
    FROM Product 
    WHERE manufacturer = 'Sauter' 
    GROUP BY image 
    ORDER BY cnt DESC 
    LIMIT 10
  `);
  
  console.log('Valori câmp image pentru produse Sauter:');
  result.rows.forEach(row => {
    console.log(`  ${row.image || '[NULL]'}: ${row.cnt} produse`);
  });
  
  // Verifică câte au imagine goală sau null
  const empty = await client.execute(`
    SELECT COUNT(*) as cnt 
    FROM Product 
    WHERE manufacturer = 'Sauter' 
    AND (image IS NULL OR image = '' OR image = 'null')
  `);
  
  console.log(`\nProduse Sauter cu imagine goală/null: ${empty.rows[0].cnt}`);
}

main().catch(console.error);
