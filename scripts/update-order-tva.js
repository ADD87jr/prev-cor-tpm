// Script pentru actualizarea setărilor în baza de date
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// Citește credențialele din .env.production
const envPath = path.join(__dirname, '..', '.env.production');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/TURSO_DATABASE_URL="([^"]+)"/);
const tokenMatch = envContent.match(/TURSO_AUTH_TOKEN="([^"]+)"/);

if (!urlMatch || !tokenMatch) {
  console.error('Nu am găsit credențialele Turso în .env.production');
  process.exit(1);
}

const client = createClient({
  url: urlMatch[1],
  authToken: tokenMatch[1]
});

async function main() {
  try {
    // Dezactivează maintenance mode
    await client.execute({
      sql: 'UPDATE SiteSettings SET value = ? WHERE key = ?',
      args: ['false', 'maintenanceMode']
    });
    
    console.log('✅ Maintenance mode dezactivat!');
    
  } catch (error) {
    console.error('Eroare:', error.message);
  }
}

main();
