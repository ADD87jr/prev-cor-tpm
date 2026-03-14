// Restaurare completă din backup Turso
// Folosește cel mai recent backup sau unul specificat

require('dotenv').config({path: '.env.local'});
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'da' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function restoreFromTursoBackup(backupName = null) {
  const backupsDir = path.join(__dirname, '..', 'backups');
  
  // Găsește backup-ul
  let backupDir;
  if (backupName) {
    backupDir = path.join(backupsDir, backupName);
  } else {
    // Găsește cel mai recent backup Turso
    const tursoBackups = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('turso-backup-') || f.startsWith('json-backup-'))
      .sort()
      .reverse();
    
    if (tursoBackups.length === 0) {
      console.error('❌ Nu există backup-uri disponibile!');
      process.exit(1);
    }
    
    console.log('\n📦 Backup-uri disponibile:');
    tursoBackups.slice(0, 10).forEach((b, i) => {
      const summaryPath = path.join(backupsDir, b, '_summary.json');
      let info = '';
      if (fs.existsSync(summaryPath)) {
        const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        const total = Object.values(summary.tables || {}).reduce((a, b) => a + b, 0);
        info = ` (${total} înregistrări)`;
      }
      console.log(`  ${i + 1}. ${b}${info}`);
    });
    
    backupDir = path.join(backupsDir, tursoBackups[0]);
    console.log(`\n📁 Se va folosi cel mai recent: ${tursoBackups[0]}`);
  }
  
  if (!fs.existsSync(backupDir)) {
    console.error(`❌ Backup-ul nu există: ${backupDir}`);
    process.exit(1);
  }
  
  // Citește sumarul
  const summaryPath = path.join(backupDir, '_summary.json');
  if (fs.existsSync(summaryPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    console.log(`\n📊 Sumar backup:`);
    console.log(`   Timestamp: ${summary.timestamp}`);
    console.log(`   Sursa: ${summary.source || 'Local'}`);
    Object.entries(summary.tables || {}).forEach(([table, count]) => {
      if (count > 0) console.log(`   - ${table}: ${count}`);
    });
  }
  
  // Confirmă restaurarea
  console.log('\n⚠️  ATENȚIE: Restaurarea va ȘTERGE datele actuale din Turso!');
  const confirmed = await askConfirmation('Continuă? (da/nu): ');
  
  if (!confirmed) {
    console.log('❌ Restaurare anulată.');
    process.exit(0);
  }
  
  // Conectare Turso
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  
  console.log('\n🔄 Restaurare în curs...\n');
  
  // Ordinea restaurării (relații FK)
  const restoreOrder = [
    { file: 'product.json', table: 'Product' },
    { file: 'products.json', table: 'Product' },
    { file: 'productvariant.json', table: 'ProductVariant' },
    { file: 'productvariants.json', table: 'ProductVariant' },
    { file: 'user.json', table: 'User' },
    { file: 'users.json', table: 'User' },
    { file: 'sitesettings.json', table: 'SiteSettings' },
    { file: 'coupon.json', table: 'Coupon' },
    { file: 'coupons.json', table: 'Coupon' },
    { file: 'order.json', table: 'Order' },
    { file: 'orders.json', table: 'Order' },
    { file: 'orderitem.json', table: 'OrderItem' },
    { file: 'faq.json', table: 'FAQ' },
    { file: 'faqs.json', table: 'FAQ' },
    { file: 'review.json', table: 'Review' },
    { file: 'reviews.json', table: 'Review' },
    { file: 'supplier.json', table: 'Supplier' },
    { file: 'suppliers.json', table: 'Supplier' },
    { file: 'supplierproduct.json', table: 'SupplierProduct' },
    { file: 'supplierproducts.json', table: 'SupplierProduct' },
  ];
  
  const processedTables = new Set();
  
  for (const { file, table } of restoreOrder) {
    if (processedTables.has(table)) continue;
    
    const filePath = path.join(backupDir, file);
    if (!fs.existsSync(filePath)) continue;
    
    processedTables.add(table);
    
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (data.length === 0) {
        console.log(`⏭️  ${table}: gol, skip`);
        continue;
      }
      
      // Șterge datele existente
      await client.execute(`DELETE FROM "${table}"`);
      
      // Inserează fiecare rând
      let inserted = 0;
      for (const row of data) {
        const columns = Object.keys(row);
        const values = columns.map(c => {
          const v = row[c];
          if (v === null) return null;
          if (typeof v === 'object') return JSON.stringify(v);
          if (typeof v === 'boolean') return v ? 1 : 0;
          return v;
        });
        
        try {
          await client.execute({
            sql: `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
            args: values
          });
          inserted++;
        } catch (e) {
          // Ignoră erorile de duplicate
        }
      }
      
      console.log(`✓ ${table}: ${inserted}/${data.length} restaurate`);
    } catch (error) {
      console.log(`✗ ${table}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Restaurare completă!');
}

// Dacă rulat direct
if (require.main === module) {
  const backupName = process.argv[2]; // Opțional: numele backup-ului
  restoreFromTursoBackup(backupName).catch(console.error);
}

module.exports = { restoreFromTursoBackup };
