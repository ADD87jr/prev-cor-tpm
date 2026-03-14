// Sincronizare: Turso (producție) → SQLite local (dev.db)
// Rulează: node scripts/import-local-libsql.js
// Sau folosește ultimul backup: node scripts/import-local-libsql.js --from-backup
require('dotenv').config({path: '.env.local'});
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// Coloanele valide pentru schema locală
const LOCAL_PRODUCT_COLUMNS = [
  'id', 'name', 'nameEn', 'price', 'listPrice', 'purchasePrice', 'currency',
  'manufacturer', 'description', 'descriptionEn', 'image', 'images', 'type',
  'domain', 'stock', 'onDemand', 'sku', 'brand', 'variants', 'deliveryTime',
  'deliveryTimeEn', 'specs', 'specsEn', 'advantages', 'advantagesEn',
  'couponCode', 'discount', 'discountType', 'pdfUrl', 'pdfUrlEn',
  'safetySheetUrl', 'safetySheetUrlEn', 'model3dUrl'
];

const LOCAL_SUPPLIER_COLUMNS = [
  'id', 'name', 'slug', 'description', 'website', 'email', 'phone',
  'address', 'logo', 'active', 'currency', 'priceMultiplier', 'apiType',
  'apiUrl', 'apiKey'
];

async function importFromBackup() {
  // Conectare la baza de date locală SQLite
  const localClient = createClient({
    url: 'file:prisma/dev.db',
  });
  
  // Găsește cel mai recent backup Turso
  const backupsDir = path.join(__dirname, '..', 'backups');
  const tursoBackups = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('turso-backup-'))
    .sort()
    .reverse();
  
  if (tursoBackups.length === 0) {
    console.error('❌ Nu există backup-uri Turso!');
    process.exit(1);
  }
  
  const backupDir = path.join(backupsDir, tursoBackups[0]);
  console.log(`\n📦 Import din: ${tursoBackups[0]}\n`);
  
  // Import Suppliers
  const suppliersFile = path.join(backupDir, 'supplier.json');
  if (fs.existsSync(suppliersFile)) {
    const suppliers = JSON.parse(fs.readFileSync(suppliersFile, 'utf8'));
    console.log(`📥 Import ${suppliers.length} furnizori...`);
    
    // Șterge furnizorii existenți
    await localClient.execute('DELETE FROM Supplier');
    
    for (const supplier of suppliers) {
      // Filtrează doar coloanele valide
      const columns = Object.keys(supplier).filter(c => LOCAL_SUPPLIER_COLUMNS.includes(c));
      const values = columns.map(c => {
        const v = supplier[c];
        if (v === null) return null;
        if (typeof v === 'boolean') return v ? 1 : 0;
        return v;
      });
      
      try {
        await localClient.execute({
          sql: `INSERT INTO Supplier (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
          args: values
        });
      } catch (e) {
        console.log(`   ⚠️ Eroare furnizor ${supplier.name}: ${e.message}`);
      }
    }
    console.log(`✅ Furnizori importați: ${suppliers.length}`);
  }
  
  // Import Products
  const productsFile = path.join(backupDir, 'product.json');
  if (fs.existsSync(productsFile)) {
    const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
    console.log(`📥 Import ${products.length} produse...`);
    
    // Șterge produsele existente
    await localClient.execute('DELETE FROM Product');
    
    let imported = 0;
    let errors = 0;
    
    for (const product of products) {
      // Filtrează doar coloanele valide pentru schema locală
      const columns = Object.keys(product).filter(c => LOCAL_PRODUCT_COLUMNS.includes(c));
      const values = columns.map(c => {
        const v = product[c];
        if (v === null) return null;
        if (typeof v === 'object') return JSON.stringify(v);
        if (typeof v === 'boolean') return v ? 1 : 0;
        return v;
      });
      
      try {
        await localClient.execute({
          sql: `INSERT INTO Product (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
          args: values
        });
        imported++;
        
        if (imported % 500 === 0) {
          console.log(`   ... ${imported}/${products.length}`);
        }
      } catch (e) {
        errors++;
        if (errors <= 5) {
          console.log(`   ⚠️ Eroare produs ${product.sku}: ${e.message}`);
        }
      }
    }
    
    console.log(`✅ Produse importate: ${imported}/${products.length}`);
    if (errors > 0) console.log(`   ⚠️ Erori: ${errors}`);
  }
  
  // Import ProductVariants
  const variantsFile = path.join(backupDir, 'productvariant.json');
  if (fs.existsSync(variantsFile)) {
    const variants = JSON.parse(fs.readFileSync(variantsFile, 'utf8'));
    if (variants.length > 0) {
      console.log(`📥 Import ${variants.length} variante...`);
      
      await localClient.execute('DELETE FROM ProductVariant');
      
      for (const v of variants) {
        const columns = Object.keys(v);
        const values = columns.map(c => {
          const val = v[c];
          if (val === null) return null;
          if (typeof val === 'object') return JSON.stringify(val);
          if (typeof val === 'boolean') return val ? 1 : 0;
          return val;
        });
        
        try {
          await localClient.execute({
            sql: `INSERT INTO ProductVariant (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
            args: values
          });
        } catch (e) {}
      }
      console.log(`✅ Variante importate: ${variants.length}`);
    }
  }
  
  // Verificare finală
  const countResult = await localClient.execute('SELECT COUNT(*) as cnt FROM Product');
  console.log(`\n🎉 Import complet! Total produse în baza locală: ${countResult.rows[0].cnt}`);
}

importFromBackup().catch(console.error);
