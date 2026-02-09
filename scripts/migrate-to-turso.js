/**
 * Script de migrare date din SQLite local în Turso Cloud
 * Rulează cu: node scripts/migrate-to-turso.js
 */

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');

// Configurare Turso
const TURSO_DATABASE_URL = 'libsql://prevcortpm-add87jr.aws-eu-west-1.turso.io';
const TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzA2NTkyNjIsImlkIjoiYjUzYWM0YzItOTY4NS00MDQzLTg5MjItZTllOTdiMjQ2YzczIiwicmlkIjoiYzc1MTFkOGYtOGUyNS00MjdkLWFkYjEtNDc4MTEyYjdhMGJjIn0.SF4Hc5sfdX-IRAb0vHqpDDWqg7hfgLDTfR-g0G2d6VSQp7eSvjXX2-aMlsRi_Slvr70p45J7cJvmaYjz27_6Bw';

async function migrate() {
  console.log('🚀 Starting migration to Turso...\n');

  // Conectare la SQLite local
  const localPrisma = new PrismaClient();
  
  // Conectare directă la Turso (fără Prisma adapter)
  const turso = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN,
  });

  try {
    // 1. Creăm tabelele în Turso
    console.log('📦 Creating schema in Turso...');
    
    const tables = [
      `CREATE TABLE IF NOT EXISTS Product (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        nameEn TEXT,
        price REAL NOT NULL,
        listPrice REAL,
        purchasePrice REAL,
        manufacturer TEXT,
        description TEXT NOT NULL,
        descriptionEn TEXT,
        image TEXT NOT NULL,
        images TEXT,
        type TEXT NOT NULL,
        domain TEXT NOT NULL,
        stock INTEGER NOT NULL,
        onDemand INTEGER DEFAULT 0,
        sku TEXT,
        brand TEXT,
        variants TEXT,
        deliveryTime TEXT,
        deliveryTimeEn TEXT,
        specs TEXT,
        specsEn TEXT,
        advantages TEXT,
        advantagesEn TEXT,
        couponCode TEXT,
        discount REAL,
        discountType TEXT,
        pdfUrl TEXT,
        pdfUrlEn TEXT,
        safetySheetUrl TEXT,
        safetySheetUrlEn TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS User (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        blocked INTEGER DEFAULT 0,
        isAdmin INTEGER DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS "Order" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        number TEXT,
        date TEXT DEFAULT CURRENT_TIMESTAMP,
        total REAL NOT NULL,
        userId INTEGER,
        items TEXT NOT NULL,
        clientData TEXT,
        productId INTEGER,
        invoiceUrl TEXT,
        courierCost REAL,
        courierType TEXT,
        tva REAL,
        subtotalPretVanzare REAL,
        subtotalDupaReduceri REAL,
        reducereTotala REAL,
        deliveryType TEXT,
        deliveryLabel TEXT,
        status TEXT DEFAULT 'pending',
        source TEXT,
        statusUpdatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        paymentMethod TEXT,
        awb TEXT,
        courierName TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS Newsletter (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        subscribedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        active INTEGER DEFAULT 1,
        source TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS SiteSettings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS AdminLog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        entityId INTEGER,
        details TEXT,
        adminEmail TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
    ];

    for (const sql of tables) {
      await turso.execute(sql);
    }
    console.log('✅ Schema created!\n');

    // 2. Migrăm produsele
    console.log('📦 Migrating products...');
    const products = await localPrisma.product.findMany();
    console.log(`   Found ${products.length} products`);
    
    for (const product of products) {
      try {
        await turso.execute({
          sql: `INSERT OR REPLACE INTO Product (id, name, nameEn, price, listPrice, purchasePrice, manufacturer, description, descriptionEn, image, images, type, domain, stock, onDemand, sku, brand, variants, deliveryTime, deliveryTimeEn, specs, specsEn, advantages, advantagesEn, couponCode, discount, discountType, pdfUrl, pdfUrlEn, safetySheetUrl, safetySheetUrlEn)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            product.id, product.name, product.nameEn, product.price, product.listPrice,
            product.purchasePrice, product.manufacturer, product.description, product.descriptionEn,
            product.image, JSON.stringify(product.images), product.type, product.domain,
            product.stock, product.onDemand ? 1 : 0, product.sku, product.brand,
            JSON.stringify(product.variants), product.deliveryTime, product.deliveryTimeEn,
            JSON.stringify(product.specs), JSON.stringify(product.specsEn),
            JSON.stringify(product.advantages), JSON.stringify(product.advantagesEn),
            product.couponCode, product.discount, product.discountType,
            product.pdfUrl, product.pdfUrlEn, product.safetySheetUrl, product.safetySheetUrlEn
          ]
        });
        console.log(`   ✓ Product: ${product.name}`);
      } catch (err) {
        console.error(`   ✗ Failed: ${product.name}`, err.message);
      }
    }

    // 3. Migrăm utilizatorii
    console.log('\n👤 Migrating users...');
    const users = await localPrisma.user.findMany();
    console.log(`   Found ${users.length} users`);
    
    for (const user of users) {
      try {
        await turso.execute({
          sql: `INSERT OR REPLACE INTO User (id, email, password, name, blocked, isAdmin)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [user.id, user.email, user.password, user.name, user.blocked ? 1 : 0, user.isAdmin ? 1 : 0]
        });
        console.log(`   ✓ User: ${user.email}`);
      } catch (err) {
        console.error(`   ✗ Failed: ${user.email}`, err.message);
      }
    }

    // 4. Migrăm comenzile
    console.log('\n📋 Migrating orders...');
    const orders = await localPrisma.order.findMany();
    console.log(`   Found ${orders.length} orders`);
    
    for (const order of orders) {
      try {
        await turso.execute({
          sql: `INSERT OR REPLACE INTO "Order" (id, number, date, total, userId, items, clientData, productId, invoiceUrl, courierCost, courierType, tva, subtotalPretVanzare, subtotalDupaReduceri, reducereTotala, deliveryType, deliveryLabel, status, source, statusUpdatedAt, paymentMethod, awb, courierName)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            order.id, order.number, order.date?.toISOString(), order.total, order.userId,
            JSON.stringify(order.items), JSON.stringify(order.clientData), order.productId,
            order.invoiceUrl, order.courierCost, order.courierType, order.tva,
            order.subtotalPretVanzare, order.subtotalDupaReduceri, order.reducereTotala,
            order.deliveryType, order.deliveryLabel, order.status, order.source,
            order.statusUpdatedAt?.toISOString(), order.paymentMethod, order.awb, order.courierName
          ]
        });
        console.log(`   ✓ Order: ${order.number || order.id}`);
      } catch (err) {
        console.error(`   ✗ Failed order ${order.id}:`, err.message);
      }
    }

    console.log('\n✅ Migration completed!');
    console.log(`   Products: ${products.length}`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Orders: ${orders.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await localPrisma.$disconnect();
    turso.close();
  }
}

migrate();
