require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check() {
  console.log('=== DOMENII EXISTENTE ===');
  const doms = await db.execute(`SELECT DISTINCT domain FROM Product WHERE domain IS NOT NULL ORDER BY domain`);
  doms.rows.forEach(d => console.log('  ' + d.domain));
  
  console.log('\n=== TIPURI EXISTENTE ===');
  const types = await db.execute(`SELECT DISTINCT type FROM Product WHERE type IS NOT NULL ORDER BY type`);
  types.rows.forEach(t => console.log('  ' + t.type));
  
  console.log('\n=== PRODUSE SAUTER - DISTRIBUȚIE DOMENII/TIPURI ===');
  const sauter = await db.execute(`
    SELECT domain, type, COUNT(*) as cnt 
    FROM Product 
    WHERE manufacturer = 'Sauter' 
    GROUP BY domain, type 
    ORDER BY cnt DESC
  `);
  sauter.rows.forEach(s => console.log('  ' + (s.domain || 'N/A').padEnd(30) + ' | ' + (s.type || 'N/A').padEnd(20) + ' | ' + s.cnt));

  console.log('\n=== EXEMPLE PIESE SCHIMB ===');
  const spare = await db.execute(`
    SELECT sku, name, domain, type 
    FROM Product 
    WHERE manufacturer = 'Sauter' AND type = 'Spare Parts'
    LIMIT 10
  `);
  spare.rows.forEach(p => console.log('  ' + (p.sku || '').padEnd(18) + ' | ' + (p.name || '').substring(0,35)));
}
check();
