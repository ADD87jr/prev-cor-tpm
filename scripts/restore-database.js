// Script de restaurare date din backup JSON
// Folosire: node scripts/restore-database.js [cale-backup]
// Exemplu: node scripts/restore-database.js backups/json-backup-2026-03-01T10-30-00

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreDatabase(backupPath) {
  if (!backupPath) {
    // Găsește cel mai recent backup
    const backupsDir = path.join(__dirname, '..', 'backups');
    const jsonBackups = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('json-backup-') && fs.statSync(path.join(backupsDir, f)).isDirectory())
      .sort()
      .reverse();
    
    if (jsonBackups.length === 0) {
      console.error('❌ Nu există backup-uri disponibile!');
      process.exit(1);
    }
    
    backupPath = path.join(backupsDir, jsonBackups[0]);
    console.log(`📁 Folosesc cel mai recent backup: ${jsonBackups[0]}`);
  }
  
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Calea backup nu există: ${backupPath}`);
    process.exit(1);
  }
  
  console.log(`\n🔄 Restaurare din: ${backupPath}`);
  console.log(`⏰ ${new Date().toLocaleString('ro-RO')}\n`);
  
  // Ordine importantă: restaurează mai întâi tabelele fără dependențe
  const restoreOrder = [
    { name: 'siteSettings', model: prisma.siteSettings },
    { name: 'users', model: prisma.user },
    { name: 'coupons', model: prisma.coupon },
    { name: 'faqs', model: prisma.faq },
    { name: 'newsletters', model: prisma.newsletter },
    { name: 'suppliers', model: prisma.supplier },
    { name: 'products', model: prisma.product },
    { name: 'productVariants', model: prisma.productVariant },
    { name: 'supplierProducts', model: prisma.supplierProduct },
    { name: 'orders', model: prisma.order },
    { name: 'invoices', model: prisma.invoice },
    { name: 'reviews', model: prisma.review },
    { name: 'wishlists', model: prisma.wishlist },
    { name: 'abandonedCarts', model: prisma.abandonedCart },
    { name: 'priceHistory', model: prisma.priceHistory },
    { name: 'quoteRequests', model: prisma.quoteRequest },
    { name: 'auditLogs', model: prisma.auditLog },
  ];
  
  for (const { name, model } of restoreOrder) {
    const filePath = path.join(backupPath, `${name}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠ ${name}: fișier lipsă, skip`);
      continue;
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (data.length === 0) {
        console.log(`⚪ ${name}: 0 înregistrări`);
        continue;
      }
      
      // Curăță datele vechi
      await model.deleteMany({});
      
      // Restaurează înregistrările
      let restored = 0;
      for (const record of data) {
        try {
          // Curăță câmpurile care nu trebuie inserate
          const cleanRecord = { ...record };
          
          // Pentru products, asigură-te că specs/advantages sunt arrays
          if (name === 'products') {
            if (typeof cleanRecord.specs === 'string') {
              try { cleanRecord.specs = JSON.parse(cleanRecord.specs); } catch(e) {}
            }
            if (typeof cleanRecord.advantages === 'string') {
              try { cleanRecord.advantages = JSON.parse(cleanRecord.advantages); } catch(e) {}
            }
            if (typeof cleanRecord.specsEn === 'string') {
              try { cleanRecord.specsEn = JSON.parse(cleanRecord.specsEn); } catch(e) {}
            }
            if (typeof cleanRecord.advantagesEn === 'string') {
              try { cleanRecord.advantagesEn = JSON.parse(cleanRecord.advantagesEn); } catch(e) {}
            }
          }
          
          await model.create({ data: cleanRecord });
          restored++;
        } catch (err) {
          // Încearcă fără ID (pentru auto-increment)
          try {
            const { id, ...withoutId } = record;
            await model.create({ data: withoutId });
            restored++;
          } catch (err2) {
            console.log(`  ✗ Eroare ${name} #${record.id}: ${err2.message.slice(0, 50)}`);
          }
        }
      }
      
      console.log(`✓ ${name}: ${restored}/${data.length} restaurate`);
      
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Restaurare completată!\n');
}

// Rulează
const backupArg = process.argv[2];
restoreDatabase(backupArg)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
