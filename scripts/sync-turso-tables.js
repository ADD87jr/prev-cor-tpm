// Script pentru a crea tabelele lipsă în Turso
const { createClient } = require('@libsql/client');

async function syncTables() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const createTableStatements = [
    // ProductVariant
    `CREATE TABLE IF NOT EXISTS "ProductVariant" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "productId" INTEGER NOT NULL,
      "code" TEXT NOT NULL,
      "compatibil" TEXT,
      "compatibilEn" TEXT,
      "greutate" REAL,
      "stoc" INTEGER DEFAULT 0,
      "pret" REAL,
      "modAmbalare" TEXT,
      "modAmbalareEn" TEXT,
      "descriere" TEXT,
      "descriereEn" TEXT,
      "active" INTEGER DEFAULT 1,
      "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
    )`,

    // Wishlist
    `CREATE TABLE IF NOT EXISTS "Wishlist" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "email" TEXT UNIQUE NOT NULL,
      "items" TEXT NOT NULL
    )`,

    // Newsletter
    `CREATE TABLE IF NOT EXISTS "Newsletter" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "email" TEXT UNIQUE NOT NULL,
      "name" TEXT,
      "subscribedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
      "active" INTEGER DEFAULT 1,
      "source" TEXT
    )`,

    // PushSubscription
    `CREATE TABLE IF NOT EXISTS "PushSubscription" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "endpoint" TEXT UNIQUE NOT NULL,
      "p256dh" TEXT NOT NULL,
      "auth" TEXT NOT NULL,
      "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
      "userAgent" TEXT,
      "isAdmin" INTEGER DEFAULT 1
    )`,

    // AdminLog
    `CREATE TABLE IF NOT EXISTS "AdminLog" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "action" TEXT NOT NULL,
      "entity" TEXT NOT NULL,
      "entityId" INTEGER,
      "details" TEXT,
      "adminEmail" TEXT NOT NULL,
      "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Review
    `CREATE TABLE IF NOT EXISTS "Review" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "productId" INTEGER NOT NULL,
      "userName" TEXT NOT NULL,
      "rating" INTEGER NOT NULL,
      "text" TEXT NOT NULL,
      "textEn" TEXT,
      "approved" INTEGER DEFAULT 0,
      "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Invoice
    `CREATE TABLE IF NOT EXISTS "Invoice" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "series" TEXT NOT NULL,
      "number" INTEGER NOT NULL,
      "orderId" INTEGER UNIQUE NOT NULL,
      "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // SiteSettings
    `CREATE TABLE IF NOT EXISTS "SiteSettings" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "key" TEXT UNIQUE NOT NULL,
      "value" TEXT NOT NULL,
      "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // BlogPost
    `CREATE TABLE IF NOT EXISTS "BlogPost" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "title" TEXT NOT NULL,
      "slug" TEXT UNIQUE NOT NULL,
      "content" TEXT NOT NULL,
      "excerpt" TEXT,
      "image" TEXT,
      "author" TEXT,
      "category" TEXT,
      "tags" TEXT,
      "published" INTEGER DEFAULT 0,
      "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // AbandonedCart
    `CREATE TABLE IF NOT EXISTS "AbandonedCart" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "email" TEXT NOT NULL,
      "phone" TEXT,
      "items" TEXT NOT NULL,
      "total" REAL NOT NULL,
      "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
      "emailSent" INTEGER DEFAULT 0,
      "emailSentAt" DATETIME,
      "recovered" INTEGER DEFAULT 0
    )`,

    // AdminSession
    `CREATE TABLE IF NOT EXISTS "AdminSession" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "adminId" TEXT NOT NULL,
      "token" TEXT UNIQUE NOT NULL,
      "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" DATETIME NOT NULL,
      "ipAddress" TEXT,
      "userAgent" TEXT
    )`,

    // AuditLog
    `CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "adminId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "resource" TEXT NOT NULL,
      "resourceId" TEXT,
      "details" TEXT,
      "ipAddress" TEXT NOT NULL,
      "userAgent" TEXT,
      "success" INTEGER NOT NULL,
      "timestamp" DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  console.log('🔄 Creating missing tables in Turso...\n');

  for (const sql of createTableStatements) {
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)?.[1] || 'Unknown';
    try {
      await client.execute(sql);
      console.log(`✅ Table ${tableName} - OK`);
    } catch (error) {
      console.error(`❌ Table ${tableName} - Error:`, error.message);
    }
  }

  // Verify tables
  console.log('\n📋 Verifying all tables:');
  const tables = await client.execute(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`);
  for (const row of tables.rows) {
    console.log(`  - ${row.name}`);
  }

  console.log('\n✅ Done!');
}

syncTables().catch(console.error);
