require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Tipuri noi de adăugat (din produsele Siemens)
const NEW_TYPES = [
  'Controller universal HVAC',
  'Controller Fancoil',
  'Controller cascadă',
  'Controller temperatură',
  'Controller încălzire',
  'Controller hotă',
  'Modul extensie',
  'Modul extensie I/O',
  'Interfață comunicație',
  'Gateway comunicație',
  'Touch Panel TCP/IP',
  'Display universal',
  'Unitate centrală control',
  'Dispozitiv monitorizare',
  'Indicator presiune cameră',
  'Monitor condiții cameră',
  'Regulator VAV',
  'Convertor semnal',
  'Transformator',
  'Servomotor',
  'Cadru montaj',
  'Echipament automatizare'
];

async function addMissingTypes() {
  console.log('=== Adăugare tipuri lipsă ===\n');
  
  // Citește tipurile existente
  const result = await db.execute({
    sql: 'SELECT value FROM SiteSettings WHERE key = ?',
    args: ['product_types']
  });
  
  let types = [];
  if (result.rows.length > 0) {
    types = JSON.parse(result.rows[0].value);
  }
  
  console.log(`Tipuri existente: ${types.length}`);
  
  // Găsește ID-ul maxim
  let maxId = 0;
  types.forEach(t => { if (t.id > maxId) maxId = t.id; });
  
  // Adaugă tipurile lipsă
  const existingNames = types.map(t => t.name);
  let added = 0;
  
  for (const typeName of NEW_TYPES) {
    if (!existingNames.includes(typeName)) {
      maxId++;
      types.push({ id: maxId, name: typeName, domainId: undefined, subcategories: [] });
      console.log(`✅ Adăugat: ${typeName} (ID: ${maxId})`);
      added++;
    } else {
      console.log(`⏭️  Există deja: ${typeName}`);
    }
  }
  
  // Salvează în baza de date
  if (added > 0) {
    await db.execute({
      sql: 'UPDATE SiteSettings SET value = ?, updatedAt = ? WHERE key = ?',
      args: [JSON.stringify(types), new Date().toISOString(), 'product_types']
    });
    console.log(`\n✅ Salvate ${types.length} tipuri (adăugate ${added} noi)`);
  } else {
    console.log('\n⚠️ Toate tipurile existau deja');
  }
  
  // Afișează lista finală
  console.log('\n=== Tipuri finale ===');
  types.forEach(t => console.log(`  ${t.id}. ${t.name}`));
}

addMissingTypes();
