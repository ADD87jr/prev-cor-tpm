/**
 * Script de sincronizare furnizori între Turso (producție) și SQLite local
 * Rulează: node scripts/sync-suppliers.js
 * 
 * Opțiuni:
 *   --to-local     Sincronizează Turso → SQLite local (implicit)
 *   --to-turso     Sincronizează SQLite local → Turso
 *   --dry-run      Afișează ce s-ar sincroniza fără a salva
 *   --silent       Mod silențios (output minim)
 */

const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });
const path = require('path');

const args = process.argv.slice(2);
const silent = args.includes('--silent');
const log = (...msg) => { if (!silent) console.log(...msg); };

// Turso client (producție)
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// SQLite local client
const localDbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const local = createClient({
  url: `file:${localDbPath}`
});

async function getLocalSuppliers() {
  const result = await local.execute('SELECT * FROM Supplier ORDER BY id');
  return result.rows;
}

async function getTursoSuppliers() {
  const result = await turso.execute('SELECT * FROM Supplier ORDER BY id');
  return result.rows;
}

// Helper: convert undefined to null
const n = (v) => v === undefined ? null : v;

async function syncToLocal(suppliers, dryRun = false) {
  if (dryRun) {
    log('\n[DRY RUN] Ar sincroniza în SQLite local:', suppliers.length, 'furnizori');
    suppliers.forEach(s => log(`  - [${s.id}] ${s.name}`));
    return;
  }
  
  for (const s of suppliers) {
    // Check if exists
    const exists = await local.execute({ sql: 'SELECT id FROM Supplier WHERE id = ?', args: [s.id] });
    
    if (exists.rows.length > 0) {
      // Update
      await local.execute({
        sql: `UPDATE Supplier SET 
          name=?, email=?, phone=?, address=?, contactPerson=?, notes=?, 
          active=?, rating=?, website=?, cui=?, dropshipping=?,
          apiType=?, apiEndpoint=?, apiKey=?, apiSecret=?, apiHeaders=?,
          orderEndpoint=?, stockEndpoint=?, trackingEndpoint=?,
          autoForwardOrders=?, autoSyncStock=?, stockSyncInterval=?,
          lastStockSync=?, markupPercent=?, markupFixed=?, minOrderValue=?, shippingCost=?,
          updatedAt=datetime('now') 
          WHERE id=?`,
        args: [
          n(s.name), n(s.email), n(s.phone), n(s.address), n(s.contactPerson), n(s.notes),
          n(s.active), n(s.rating), n(s.website), n(s.cui), n(s.dropshipping),
          n(s.apiType), n(s.apiEndpoint), n(s.apiKey), n(s.apiSecret), n(s.apiHeaders),
          n(s.orderEndpoint), n(s.stockEndpoint), n(s.trackingEndpoint),
          n(s.autoForwardOrders), n(s.autoSyncStock), n(s.stockSyncInterval),
          n(s.lastStockSync), n(s.markupPercent), n(s.markupFixed), n(s.minOrderValue), n(s.shippingCost),
          s.id
        ]
      });
    } else {
      // Insert
      await local.execute({
        sql: `INSERT INTO Supplier (
          id, name, email, phone, address, contactPerson, notes, 
          active, rating, website, cui, dropshipping,
          apiType, apiEndpoint, apiKey, apiSecret, apiHeaders,
          orderEndpoint, stockEndpoint, trackingEndpoint,
          autoForwardOrders, autoSyncStock, stockSyncInterval,
          lastStockSync, markupPercent, markupFixed, minOrderValue, shippingCost,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [
          s.id, n(s.name), n(s.email), n(s.phone), n(s.address), n(s.contactPerson), n(s.notes),
          s.active ?? 1, n(s.rating), n(s.website), n(s.cui), s.dropshipping ?? 0,
          n(s.apiType), n(s.apiEndpoint), n(s.apiKey), n(s.apiSecret), n(s.apiHeaders),
          n(s.orderEndpoint), n(s.stockEndpoint), n(s.trackingEndpoint),
          s.autoForwardOrders ?? 0, s.autoSyncStock ?? 0, n(s.stockSyncInterval),
          n(s.lastStockSync), n(s.markupPercent), n(s.markupFixed), n(s.minOrderValue), n(s.shippingCost)
        ]
      });
    }
    log(`✓ [${s.id}] ${s.name}`);
  }
  
  const result = await local.execute('SELECT COUNT(*) as cnt FROM Supplier');
  log(`\n✅ SQLite local: ${result.rows[0].cnt} furnizori`);
}

async function syncToTurso(suppliers, dryRun = false) {
  if (dryRun) {
    log('\n[DRY RUN] Ar sincroniza în Turso:', suppliers.length, 'furnizori');
    suppliers.forEach(s => log(`  - [${s.id}] ${s.name}`));
    return;
  }
  
  for (const s of suppliers) {
    // Check if exists
    const exists = await turso.execute({ sql: 'SELECT id FROM Supplier WHERE id = ?', args: [s.id] });
    
    if (exists.rows.length > 0) {
      // Update
      await turso.execute({
        sql: `UPDATE Supplier SET 
          name=?, email=?, phone=?, address=?, contactPerson=?, notes=?, 
          active=?, rating=?, website=?, cui=?, dropshipping=?,
          apiType=?, apiEndpoint=?, apiKey=?, apiSecret=?, apiHeaders=?,
          orderEndpoint=?, stockEndpoint=?, trackingEndpoint=?,
          autoForwardOrders=?, autoSyncStock=?, stockSyncInterval=?,
          lastStockSync=?, markupPercent=?, markupFixed=?, minOrderValue=?, shippingCost=?,
          updatedAt=datetime('now') 
          WHERE id=?`,
        args: [
          n(s.name), n(s.email), n(s.phone), n(s.address), n(s.contactPerson), n(s.notes),
          n(s.active), n(s.rating), n(s.website), n(s.cui), n(s.dropshipping),
          n(s.apiType), n(s.apiEndpoint), n(s.apiKey), n(s.apiSecret), n(s.apiHeaders),
          n(s.orderEndpoint), n(s.stockEndpoint), n(s.trackingEndpoint),
          n(s.autoForwardOrders), n(s.autoSyncStock), n(s.stockSyncInterval),
          n(s.lastStockSync), n(s.markupPercent), n(s.markupFixed), n(s.minOrderValue), n(s.shippingCost),
          s.id
        ]
      });
    } else {
      // Insert
      await turso.execute({
        sql: `INSERT INTO Supplier (
          id, name, email, phone, address, contactPerson, notes, 
          active, rating, website, cui, dropshipping,
          apiType, apiEndpoint, apiKey, apiSecret, apiHeaders,
          orderEndpoint, stockEndpoint, trackingEndpoint,
          autoForwardOrders, autoSyncStock, stockSyncInterval,
          lastStockSync, markupPercent, markupFixed, minOrderValue, shippingCost,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [
          s.id, n(s.name), n(s.email), n(s.phone), n(s.address), n(s.contactPerson), n(s.notes),
          s.active ?? 1, n(s.rating), n(s.website), n(s.cui), s.dropshipping ?? 0,
          n(s.apiType), n(s.apiEndpoint), n(s.apiKey), n(s.apiSecret), n(s.apiHeaders),
          n(s.orderEndpoint), n(s.stockEndpoint), n(s.trackingEndpoint),
          s.autoForwardOrders ?? 0, s.autoSyncStock ?? 0, n(s.stockSyncInterval),
          n(s.lastStockSync), n(s.markupPercent), n(s.markupFixed), n(s.minOrderValue), n(s.shippingCost)
        ]
      });
    }
    log(`✓ [${s.id}] ${s.name}`);
  }
  
  const result = await turso.execute('SELECT COUNT(*) as cnt FROM Supplier');
  log(`\n✅ Turso: ${result.rows[0].cnt} furnizori`);
}

async function main() {
  const toTurso = args.includes('--to-turso');
  const dryRun = args.includes('--dry-run');
  
  log('='.repeat(50));
  log(' Script Sincronizare Furnizori');
  log('='.repeat(50));
  
  if (toTurso) {
    log('\n📦 Direcție: SQLite local → Turso (producție)');
    const localSuppliers = await getLocalSuppliers();
    log(`\nFurnizori în SQLite local: ${localSuppliers.length}`);
    await syncToTurso(localSuppliers, dryRun);
  } else {
    log('\n📦 Direcție: Turso (producție) → SQLite local');
    const tursoSuppliers = await getTursoSuppliers();
    log(`\nFurnizori în Turso: ${tursoSuppliers.length}`);
    await syncToLocal(tursoSuppliers, dryRun);
  }
  
  log('\n✅ Sincronizare completă!');
}

main().catch(console.error);
