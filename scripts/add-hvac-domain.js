require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function addHVAC() {
  // Verifică domeniile existente
  const result = await db.execute("SELECT value FROM SiteSettings WHERE key = 'product_domains'");
  
  let domains = [];
  if (result.rows.length > 0 && result.rows[0].value) {
    domains = JSON.parse(result.rows[0].value);
    console.log('Domenii existente:', domains.map(d => d.name));
  } else {
    console.log('Nu există domenii salvate, folosim default');
    domains = [
      { id: 1, name: "Automatizari industriale" },
      { id: 2, name: "Industrial" },
      { id: 3, name: "Altele" }
    ];
  }
  
  // Verifică dacă HVAC există deja
  if (domains.some(d => d.name === 'HVAC')) {
    console.log('HVAC există deja în listă!');
    return;
  }
  
  // Calculează următorul ID
  const maxId = Math.max(...domains.map(d => d.id), 0);
  
  // Adaugă HVAC
  domains.push({ id: maxId + 1, name: 'HVAC' });
  
  // Salvează
  const newValue = JSON.stringify(domains);
  await db.execute({
    sql: "INSERT INTO SiteSettings (key, value, updatedAt) VALUES ('product_domains', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = ?, updatedAt = datetime('now')",
    args: [newValue, newValue]
  });
  
  console.log('✅ HVAC adăugat! Domenii actualizate:', domains.map(d => d.name));
}

addHVAC().catch(console.error);
