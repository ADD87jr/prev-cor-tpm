// Backup Turso cu notificare email în caz de eroare
// Rulează zilnic prin Task Scheduler

require('dotenv').config({path: '.env.local'});
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

async function sendAlert(subject, message) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'backup@prevcortpm.ro',
      to: 'office@prevcortpm.ro',
      subject: `[BACKUP] ${subject}`,
      text: message,
      html: `<pre>${message}</pre>`,
    });
    console.log('📧 Alertă trimisă pe email');
  } catch (e) {
    console.error('❌ Nu s-a putut trimite alerta:', e.message);
  }
}

async function backupTursoWithAlert() {
  const startTime = new Date();
  let success = false;
  let summary = '';
  
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupDir = path.join(__dirname, '..', 'backups', `turso-backup-${timestamp}`);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    console.log(`\n📦 BACKUP TURSO - ${new Date().toLocaleString('ro-RO')}`);
    console.log(`📁 Director: ${backupDir}\n`);

    const tables = [
      'Product', 'ProductVariant', 'Order', 'OrderItem', 'User',
      'SiteSettings', 'Coupon', 'FAQ', 'Review', 'Newsletter',
      'AbandonedCart', 'AuditLog', 'PriceHistory', 'Invoice',
      'Wishlist', 'Supplier', 'SupplierProduct', 'QuoteRequest',
      'ProductQuestion', 'LoyaltyPoints'
    ];
    
    const backupSummary = { timestamp, source: 'Turso (Production)', tables: {} };
    
    for (const table of tables) {
      try {
        const result = await client.execute(`SELECT * FROM "${table}"`);
        const rows = result.rows || [];
        
        const filePath = path.join(backupDir, `${table.toLowerCase()}.json`);
        fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));
        
        backupSummary.tables[table] = rows.length;
        console.log(`✓ ${table}: ${rows.length} înregistrări`);
      } catch (e) {
        backupSummary.tables[table] = 0;
        console.log(`⚠ ${table}: tabelă inexistentă`);
      }
    }
    
    fs.writeFileSync(path.join(backupDir, '_summary.json'), JSON.stringify(backupSummary, null, 2));
    
    const totalRecords = Object.values(backupSummary.tables).reduce((a, b) => a + b, 0);
    summary = `Backup completat cu succes!\n\nTimestamp: ${timestamp}\nTotal înregistrări: ${totalRecords}\nDirector: ${backupDir}`;
    
    console.log(`\n✅ ${summary}`);
    success = true;
    
    // Șterge backup-urile vechi (păstrează ultimele 30)
    const allBackups = fs.readdirSync(path.join(__dirname, '..', 'backups'))
      .filter(f => f.startsWith('turso-backup-'))
      .sort()
      .reverse();
    
    if (allBackups.length > 30) {
      for (const old of allBackups.slice(30)) {
        const oldPath = path.join(__dirname, '..', 'backups', old);
        fs.rmSync(oldPath, { recursive: true, force: true });
        console.log(`🗑️ Șters backup vechi: ${old}`);
      }
    }
    
  } catch (error) {
    summary = `EROARE BACKUP!\n\nEroare: ${error.message}\nTimestamp: ${startTime.toISOString()}`;
    console.error(`\n❌ ${summary}`);
    
    // Trimite alertă
    await sendAlert('❌ EROARE BACKUP TURSO', summary);
  }
  
  const duration = ((new Date() - startTime) / 1000).toFixed(1);
  console.log(`\n⏱️ Durată: ${duration}s`);
  
  // Exit cu cod de eroare dacă a eșuat (pentru Task Scheduler)
  if (!success) {
    process.exit(1);
  }
}

backupTursoWithAlert().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
