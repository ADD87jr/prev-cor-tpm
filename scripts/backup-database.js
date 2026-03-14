// Script complet de backup baza de date
// Exportă toate tabelele importante în JSON pentru restaurare ușoară

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(__dirname, '..', 'backups', `json-backup-${timestamp}`);
  
  // Creează directorul de backup
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  console.log(`\n📦 Backup bază de date - ${new Date().toLocaleString('ro-RO')}`);
  console.log(`📁 Director: ${backupDir}\n`);
  
  const tables = [
    { name: 'products', query: () => prisma.product.findMany() },
    { name: 'productVariants', query: () => prisma.productVariant.findMany() },
    { name: 'orders', query: () => prisma.order.findMany() },
    { name: 'siteSettings', query: () => prisma.siteSettings.findMany() },
    { name: 'users', query: () => prisma.user.findMany() },
    { name: 'coupons', query: () => prisma.coupon.findMany() },
    { name: 'faqs', query: () => prisma.faq.findMany() },
    { name: 'reviews', query: () => prisma.review.findMany() },
    { name: 'newsletters', query: () => prisma.newsletter.findMany() },
    { name: 'abandonedCarts', query: () => prisma.abandonedCart.findMany() },
    { name: 'auditLogs', query: () => prisma.auditLog.findMany() },
    { name: 'priceHistory', query: () => prisma.priceHistory.findMany() },
    { name: 'invoices', query: () => prisma.invoice.findMany() },
    { name: 'wishlists', query: () => prisma.wishlist.findMany() },
    { name: 'suppliers', query: () => prisma.supplier.findMany() },
    { name: 'supplierProducts', query: () => prisma.supplierProduct.findMany() },
    { name: 'quoteRequests', query: () => prisma.quoteRequest.findMany() },
  ];
  
  const summary = { timestamp, tables: {} };
  
  for (const table of tables) {
    try {
      const data = await table.query();
      const filePath = path.join(backupDir, `${table.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      summary.tables[table.name] = data.length;
      console.log(`✓ ${table.name}: ${data.length} înregistrări`);
    } catch (error) {
      // Tabela poate să nu existe
      console.log(`⚠ ${table.name}: ${error.message.includes('does not exist') ? 'tabelă inexistentă' : error.message}`);
      summary.tables[table.name] = 0;
    }
  }
  
  // Salvează și un sumar
  fs.writeFileSync(
    path.join(backupDir, '_summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8'
  );
  
  // Copiază și fișierul DB SQLite
  const dbSource = path.join(__dirname, '..', 'prisma', 'dev.db');
  const dbDest = path.join(__dirname, '..', 'backups', `backup-db-${timestamp}.db`);
  
  if (fs.existsSync(dbSource)) {
    fs.copyFileSync(dbSource, dbDest);
    console.log(`\n✓ Copie SQLite: backup-db-${timestamp}.db`);
  }
  
  // Curăță backup-uri vechi (păstrează ultimele 10)
  const backupsDir = path.join(__dirname, '..', 'backups');
  const allBackups = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('json-backup-') || f.startsWith('backup-db-'))
    .sort()
    .reverse();
  
  const jsonBackups = allBackups.filter(f => f.startsWith('json-backup-'));
  const dbBackups = allBackups.filter(f => f.startsWith('backup-db-'));
  
  // Păstrează ultimele 10 din fiecare
  for (const old of jsonBackups.slice(10)) {
    const oldPath = path.join(backupsDir, old);
    fs.rmSync(oldPath, { recursive: true, force: true });
    console.log(`🗑 Șters backup vechi: ${old}`);
  }
  
  for (const old of dbBackups.slice(10)) {
    fs.unlinkSync(path.join(backupsDir, old));
    console.log(`🗑 Șters backup vechi: ${old}`);
  }
  
  // Actualizează data ultimului backup în baza de date
  try {
    await prisma.siteSettings.upsert({
      where: { key: 'last_backup_date' },
      update: { value: new Date().toISOString() },
      create: { key: 'last_backup_date', value: new Date().toISOString() }
    });
    console.log('📅 Data backup actualizată în baza de date');
  } catch (err) {
    console.log('⚠ Nu s-a putut actualiza data backup:', err.message);
  }
  
  console.log('\n✅ Backup completat cu succes!\n');
  
  return backupDir;
}

// Rulează dacă e apelat direct
if (require.main === module) {
  backupDatabase()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

module.exports = { backupDatabase };
