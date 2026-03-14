require('dotenv').config({path:'.env.local'});
const { createClient } = require('@libsql/client');
const fs = require('fs');

async function restoreVariants() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Read variants from backup
  const backupPath = 'backups/json-backup-2026-03-01T10-28-32/productVariants.json';
  const variants = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  
  console.log(`📦 Found ${variants.length} variants in backup`);
  
  // Clear existing variants
  console.log('🗑️  Clearing existing variants...');
  await client.execute('DELETE FROM ProductVariant');
  
  // Insert each variant
  for (const v of variants) {
    console.log(`➕ Inserting: ${v.id} - ${v.code}`);
    
    try {
      await client.execute({
        sql: `INSERT INTO ProductVariant (
          id, productId, code, marime, marimeEn, distantaSesizare, tipIesire, tipContact,
          tensiune, curent, protectie, material, cablu, compatibil, compatibilEn,
          greutate, stoc, pret, listPrice, purchasePrice, modAmbalare, modAmbalareEn,
          descriere, descriereEn, specsExtra, active, onDemand, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          v.id,
          v.productId,
          v.code,
          v.marime || null,
          v.marimeEn || null,
          v.distantaSesizare || null,
          v.tipIesire || null,
          v.tipContact || null,
          v.tensiune || null,
          v.curent || null,
          v.protectie || null,
          v.material || null,
          v.cablu || null,
          v.compatibil || null,
          v.compatibilEn || null,
          v.greutate || null,
          v.stoc || 0,
          v.pret,
          v.listPrice || null,
          v.purchasePrice || null,
          v.modAmbalare || null,
          v.modAmbalareEn || null,
          v.descriere || null,
          v.descriereEn || null,
          v.specsExtra ? JSON.stringify(v.specsExtra) : null,
          v.active ? 1 : 0,
          v.onDemand ? 1 : 0,
          v.createdAt || new Date().toISOString(),
          v.updatedAt || new Date().toISOString()
        ]
      });
    } catch (err) {
      console.error(`❌ Error inserting variant ${v.id}: ${err.message}`);
    }
  }
  
  // Verify
  const result = await client.execute('SELECT id, code, pret FROM ProductVariant ORDER BY id');
  console.log('\n✅ Variants in database after restore:');
  result.rows.forEach(r => console.log(`  ${r.id} - ${r.code} - ${r.pret} RON`));
  
  console.log(`\n🎉 Done! ${result.rows.length} variants restored.`);
}

restoreVariants().catch(console.error);
