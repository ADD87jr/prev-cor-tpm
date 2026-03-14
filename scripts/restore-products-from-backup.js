require('dotenv').config({path:'.env.local'});
const { createClient } = require('@libsql/client');
const fs = require('fs');

async function restoreProducts() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Read products from backup
  const backupPath = 'backups/json-backup-2026-03-01T10-28-32/products.json';
  const products = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  
  console.log(`📦 Found ${products.length} products in backup`);
  
  // First, delete existing products (optional - they may conflict)
  console.log('🗑️  Clearing existing products...');
  await client.execute('DELETE FROM Product');
  
  // Insert each product
  for (const p of products) {
    console.log(`➕ Inserting: ${p.id} - ${p.name}`);
    
    try {
      await client.execute({
        sql: `INSERT INTO Product (
          id, name, nameEn, price, listPrice, purchasePrice, manufacturer,
          description, descriptionEn, image, images, type, domain, stock, onDemand,
          sku, brand, variants, deliveryTime, deliveryTimeEn, specs, specsEn,
          advantages, advantagesEn, couponCode, discount, discountType,
          pdfUrl, pdfUrlEn, safetySheetUrl, safetySheetUrlEn, model3dUrl
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          p.id,
          p.name,
          p.nameEn || null,
          p.price,
          p.listPrice || null,
          p.purchasePrice || null,
          p.manufacturer || null,
          p.description || null,
          p.descriptionEn || null,
          p.image || null,
          p.images ? JSON.stringify(p.images) : null,
          p.type || null,
          p.domain || null,
          p.stock || 0,
          p.onDemand ? 1 : 0,
          p.sku || null,
          p.brand || null,
          p.variants ? JSON.stringify(p.variants) : null,
          p.deliveryTime || null,
          p.deliveryTimeEn || null,
          p.specs ? JSON.stringify(p.specs) : null,
          p.specsEn ? JSON.stringify(p.specsEn) : null,
          p.advantages ? JSON.stringify(p.advantages) : null,
          p.advantagesEn ? JSON.stringify(p.advantagesEn) : null,
          p.couponCode || null,
          p.discount || null,
          p.discountType || null,
          p.pdfUrl || null,
          p.pdfUrlEn || null,
          p.safetySheetUrl || null,
          p.safetySheetUrlEn || null,
          p.model3dUrl || null
        ]
      });
    } catch (err) {
      console.error(`❌ Error inserting product ${p.id}: ${err.message}`);
    }
  }
  
  // Verify
  const result = await client.execute('SELECT id, name FROM Product ORDER BY id');
  console.log('\n✅ Products in database after restore:');
  result.rows.forEach(r => console.log(`  ${r.id} - ${r.name}`));
  
  console.log(`\n🎉 Done! ${result.rows.length} products restored.`);
}

restoreProducts().catch(console.error);
