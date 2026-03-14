require('dotenv/config');
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  // Exemple produse
  const examples = await client.execute(`
    SELECT sku, name, specs, advantages 
    FROM Product 
    WHERE manufacturer = 'Sauter' 
    ORDER BY RANDOM() 
    LIMIT 5
  `);
  
  console.log('=== 5 EXEMPLE PRODUSE SAUTER ÎMBOGĂȚITE ===\n');
  
  examples.rows.forEach((p, i) => {
    console.log(`${i + 1}. ${p.sku}: ${p.name}`);
    console.log(`   Specs: ${p.specs}`);
    console.log(`   Advantages: ${p.advantages}`);
    console.log();
  });
  
  // Statistici
  const stats = await client.execute(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN specs IS NOT NULL AND specs != '[]' AND LENGTH(specs) > 10 THEN 1 END) as with_specs,
      COUNT(CASE WHEN advantages IS NOT NULL AND advantages != '[]' AND LENGTH(advantages) > 10 THEN 1 END) as with_advantages
    FROM Product 
    WHERE manufacturer = 'Sauter'
  `);
  
  const s = stats.rows[0];
  console.log('=== STATISTICI ===');
  console.log(`Total produse Sauter: ${s.total}`);
  console.log(`Cu specificații: ${s.with_specs} (${(s.with_specs/s.total*100).toFixed(1)}%)`);
  console.log(`Cu avantaje: ${s.with_advantages} (${(s.with_advantages/s.total*100).toFixed(1)}%)`);
}

main().catch(console.error);
