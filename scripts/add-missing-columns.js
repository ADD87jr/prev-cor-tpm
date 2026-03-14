require('dotenv').config({path:'.env.local'});
const { createClient } = require('@libsql/client');

async function addColumns() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  
  // Create missing tables first
  const createTableStatements = [
    `CREATE TABLE IF NOT EXISTS "DropshipProduct" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "productId" INTEGER,
      "supplierId" INTEGER NOT NULL,
      "name" TEXT NOT NULL,
      "supplierCode" TEXT,
      "supplierPrice" REAL NOT NULL,
      "currency" TEXT DEFAULT 'EUR',
      "yourPrice" REAL NOT NULL,
      "marginPercent" REAL,
      "category" TEXT,
      "description" TEXT,
      "image" TEXT,
      "stock" TEXT DEFAULT 'unknown',
      "stockQuantity" INTEGER,
      "deliveryDays" INTEGER DEFAULT 7,
      "status" TEXT DEFAULT 'active',
      "autoSync" INTEGER DEFAULT 1,
      "lastSyncAt" TEXT,
      "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS "DropshipOrder" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "orderId" INTEGER NOT NULL,
      "dropshipProductId" INTEGER NOT NULL,
      "supplierId" INTEGER NOT NULL,
      "quantity" INTEGER NOT NULL,
      "supplierOrderId" TEXT,
      "supplierAwb" TEXT,
      "courierName" TEXT,
      "status" TEXT DEFAULT 'pending',
      "supplierPrice" REAL NOT NULL,
      "clientPrice" REAL NOT NULL,
      "profit" REAL,
      "orderedAt" TEXT,
      "shippedAt" TEXT,
      "deliveredAt" TEXT,
      "trackingUrl" TEXT,
      "notes" TEXT,
      "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS "DropshipSyncLog" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "supplierId" INTEGER NOT NULL,
      "syncType" TEXT NOT NULL,
      "productsUpdated" INTEGER DEFAULT 0,
      "priceChanges" INTEGER DEFAULT 0,
      "stockChanges" INTEGER DEFAULT 0,
      "errors" TEXT,
      "status" TEXT DEFAULT 'completed',
      "startedAt" TEXT DEFAULT CURRENT_TIMESTAMP,
      "completedAt" TEXT,
      "duration" INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS "DropshipAlert" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "type" TEXT NOT NULL,
      "productId" INTEGER,
      "supplierId" INTEGER,
      "message" TEXT NOT NULL,
      "details" TEXT,
      "severity" TEXT DEFAULT 'warning',
      "resolved" INTEGER DEFAULT 0,
      "resolvedAt" TEXT,
      "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "DropshipSettings" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "supplierId" INTEGER UNIQUE NOT NULL,
      "defaultMarginPercent" REAL DEFAULT 25,
      "minMarginPercent" REAL DEFAULT 10,
      "autoUpdatePrices" INTEGER DEFAULT 1,
      "autoOrderEnabled" INTEGER DEFAULT 0,
      "syncIntervalHours" INTEGER DEFAULT 24,
      "lowStockThreshold" INTEGER DEFAULT 5,
      "emailNotifications" INTEGER DEFAULT 1,
      "apiUrl" TEXT,
      "apiKey" TEXT,
      "updatedAt" TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS "Supplier" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "email" TEXT,
      "phone" TEXT,
      "address" TEXT,
      "contactPerson" TEXT,
      "notes" TEXT,
      "active" INTEGER DEFAULT 1,
      "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS "SupplierProduct" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "supplierId" INTEGER NOT NULL,
      "productId" INTEGER NOT NULL,
      "supplierCode" TEXT,
      "purchasePrice" REAL,
      "currency" TEXT DEFAULT 'EUR',
      "leadTimeDays" INTEGER,
      "minOrderQty" INTEGER DEFAULT 1,
      "notes" TEXT,
      "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "Coupon" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "code" TEXT NOT NULL UNIQUE,
      "type" TEXT NOT NULL,
      "value" REAL NOT NULL,
      "validFrom" TEXT NOT NULL,
      "validTo" TEXT NOT NULL,
      "active" INTEGER DEFAULT 1,
      "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS "ProductQuestion" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "productId" INTEGER NOT NULL,
      "userName" TEXT NOT NULL,
      "email" TEXT,
      "question" TEXT NOT NULL,
      "answer" TEXT,
      "answeredBy" TEXT,
      "answeredAt" TEXT,
      "approved" INTEGER DEFAULT 0,
      "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "LoyaltyPoints" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "userId" INTEGER NOT NULL,
      "points" INTEGER DEFAULT 0,
      "reason" TEXT NOT NULL,
      "orderId" INTEGER,
      "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
  ];
  
  for (const sql of createTableStatements) {
    try {
      await client.execute(sql);
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)?.[1];
      console.log('✅ Table', tableName, '- OK');
    } catch (e) {
      console.log('⚠️ Create table error:', e.message.substring(0, 60));
    }
  }
  
  const alterStatements = [
    // Product columns
    'ALTER TABLE Product ADD COLUMN currency TEXT DEFAULT "EUR"',
    'ALTER TABLE Product ADD COLUMN model3dUrl TEXT',
    'ALTER TABLE Product ADD COLUMN arEnabled INTEGER DEFAULT 0',
    'ALTER TABLE Product ADD COLUMN certifications TEXT',
    'ALTER TABLE Product ADD COLUMN warrantyMonths INTEGER',
    'ALTER TABLE Product ADD COLUMN minOrderQty INTEGER DEFAULT 1',
    'ALTER TABLE Product ADD COLUMN leadTimeDays INTEGER',
    'ALTER TABLE Product ADD COLUMN hsCode TEXT',
    'ALTER TABLE Product ADD COLUMN countryOfOrigin TEXT',
    'ALTER TABLE Product ADD COLUMN metaKeywords TEXT',
    'ALTER TABLE Product ADD COLUMN metaRobots TEXT',
    'ALTER TABLE Product ADD COLUMN canonicalUrl TEXT',
    'ALTER TABLE Product ADD COLUMN supplierId INTEGER',
    'ALTER TABLE Product ADD COLUMN listPrice REAL',
    'ALTER TABLE Product ADD COLUMN carbonFootprint REAL',
    'ALTER TABLE Product ADD COLUMN isRecyclable INTEGER DEFAULT 0',
    'ALTER TABLE Product ADD COLUMN ecoScore TEXT',
    // ProductVariant columns
    'ALTER TABLE ProductVariant ADD COLUMN listPrice REAL',
    'ALTER TABLE ProductVariant ADD COLUMN purchasePrice REAL',
    'ALTER TABLE ProductVariant ADD COLUMN margin REAL',
    'ALTER TABLE ProductVariant ADD COLUMN currency TEXT DEFAULT "EUR"',
    'ALTER TABLE ProductVariant ADD COLUMN onDemand INTEGER DEFAULT 0',
    'ALTER TABLE ProductVariant ADD COLUMN modAmbalare TEXT',
    'ALTER TABLE ProductVariant ADD COLUMN modAmbalareEn TEXT',
    'ALTER TABLE ProductVariant ADD COLUMN marime TEXT',
    'ALTER TABLE ProductVariant ADD COLUMN marimeEn TEXT',
    'ALTER TABLE ProductVariant ADD COLUMN distantaSesizare TEXT',
    'ALTER TABLE ProductVariant ADD COLUMN tipIesire TEXT',
    'ALTER TABLE ProductVariant ADD COLUMN tipContact TEXT',
    'ALTER TABLE ProductVariant ADD COLUMN tensiune TEXT',
    'ALTER TABLE ProductVariant ADD COLUMN curent TEXT',
    'ALTER TABLE ProductVariant ADD COLUMN protectie TEXT',
    'ALTER TABLE ProductVariant ADD COLUMN material TEXT',
    'ALTER TABLE ProductVariant ADD COLUMN cablu TEXT',
    'ALTER TABLE ProductVariant ADD COLUMN specsExtra TEXT',
    'ALTER TABLE ProductVariant ADD COLUMN active INTEGER DEFAULT 1',
    'ALTER TABLE ProductVariant ADD COLUMN descriere TEXT',
    'ALTER TABLE ProductVariant ADD COLUMN descriereEn TEXT',
    // Order columns
    'ALTER TABLE "Order" ADD COLUMN priceConfirmToken TEXT',
    'ALTER TABLE "Order" ADD COLUMN priceConfirmExpiry TEXT',
    'ALTER TABLE "Order" ADD COLUMN priceConfirmed INTEGER DEFAULT 0',
    'ALTER TABLE "Order" ADD COLUMN priceConfirmedAt TEXT',
    'ALTER TABLE "Order" ADD COLUMN invoiceId INTEGER',
    'ALTER TABLE "Order" ADD COLUMN currency TEXT DEFAULT "RON"',
    'ALTER TABLE "Order" ADD COLUMN exchangeRate REAL',
  ];
  
  for (const sql of alterStatements) {
    try {
      await client.execute(sql);
      console.log('✅', sql.substring(12, 70));
    } catch (e) {
      if (e.message.includes('duplicate column')) {
        // Skip silently
      } else {
        console.log('⚠️', sql.substring(12, 50), '-', e.message.substring(0, 40));
      }
    }
  }
  console.log('Done!');
}
addColumns();
