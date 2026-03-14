// Backup automat din Turso (producție)
// Rulează zilnic sau înainte de operațiuni importante

require('dotenv').config({path: '.env.local'});
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

async function backupTurso() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(__dirname, '..', 'backups', `turso-backup-${timestamp}`);
  
  // Creează directorul de backup
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  console.log(`\n📦 BACKUP TURSO (Producție) - ${new Date().toLocaleString('ro-RO')}`);
  console.log(`📁 Director: ${backupDir}\n`);

  const tables = [
    'Product',
    'ProductVariant', 
    'Order',
    'OrderItem',
    'User',
    'SiteSettings',
    'Coupon',
    'FAQ',
    'Review',
    'Newsletter',
    'AbandonedCart',
    'AuditLog',
    'PriceHistory',
    'Invoice',
    'Wishlist',
    'Supplier',
    'SupplierProduct',
    'QuoteRequest',
    'ProductQuestion',
    'LoyaltyPoints',
  ];
  
  const summary = { 
    timestamp, 
    source: 'Turso (Production)',
    url: process.env.TURSO_DATABASE_URL?.replace(/\/\/.*:.*@/, '//***:***@'),
    tables: {} 
  };
  
  for (const table of tables) {
    try {
      const result = await client.execute(`SELECT * FROM "${table}"`);
      const data = result.rows;
      const filePath = path.join(backupDir, `${table.toLowerCase()}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      summary.tables[table] = data.length;
      console.log(`✓ ${table}: ${data.length} înregistrări`);
    } catch (error) {
      if (error.message.includes('no such table')) {
        console.log(`⚠ ${table}: tabelă inexistentă`);
      } else {
        console.log(`✗ ${table}: ${error.message}`);
      }
      summary.tables[table] = 0;
    }
  }
  
  // Salvează sumarul
  fs.writeFileSync(
    path.join(backupDir, '_summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8'
  );
  
  // Curăță backup-uri vechi (păstrează ultimele 30)
  const backupsDir = path.join(__dirname, '..', 'backups');
  const tursoBackups = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('turso-backup-'))
    .sort()
    .reverse();
  
  if (tursoBackups.length > 30) {
    for (const oldBackup of tursoBackups.slice(30)) {
      const oldPath = path.join(backupsDir, oldBackup);
      fs.rmSync(oldPath, { recursive: true, force: true });
      console.log(`🗑️  Șters backup vechi: ${oldBackup}`);
    }
  }
  
  console.log(`\n✅ Backup complet salvat în: ${backupDir}`);
  console.log(`📊 Total tabele: ${Object.keys(summary.tables).length}`);
  console.log(`📝 Total înregistrări: ${Object.values(summary.tables).reduce((a, b) => a + b, 0)}`);
  
  return backupDir;
}

// Exportă pentru utilizare în alte scripturi
module.exports = { backupTurso };

// Dacă rulat direct
if (require.main === module) {
  backupTurso()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Eroare backup:', err);
      process.exit(1);
    });
}
