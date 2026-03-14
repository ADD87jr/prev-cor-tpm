/**
 * Creează tabelele Configurator în Turso
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const createTableStatements = [
  `CREATE TABLE IF NOT EXISTS ConfiguratorBrand (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    logo TEXT,
    description TEXT,
    active INTEGER DEFAULT 1,
    sortOrder INTEGER DEFAULT 0
  )`,
  
  `CREATE TABLE IF NOT EXISTS ConfiguratorProduct (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brandId INTEGER NOT NULL,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    description TEXT,
    image TEXT,
    basePrice REAL NOT NULL,
    currency TEXT DEFAULT 'EUR',
    productId INTEGER,
    active INTEGER DEFAULT 1,
    sortOrder INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brandId) REFERENCES ConfiguratorBrand(id) ON DELETE CASCADE
  )`,
  
  `CREATE TABLE IF NOT EXISTS ConfiguratorCategory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    nameEn TEXT,
    icon TEXT,
    description TEXT,
    sortOrder INTEGER DEFAULT 0
  )`,
  
  `CREATE TABLE IF NOT EXISTS ConfiguratorOption (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoryId INTEGER NOT NULL,
    name TEXT NOT NULL,
    nameEn TEXT,
    description TEXT,
    sku TEXT,
    price REAL DEFAULT 0,
    currency TEXT DEFAULT 'EUR',
    image TEXT,
    productId INTEGER,
    specs TEXT,
    active INTEGER DEFAULT 1,
    sortOrder INTEGER DEFAULT 0,
    FOREIGN KEY (categoryId) REFERENCES ConfiguratorCategory(id) ON DELETE CASCADE
  )`,
  
  `CREATE TABLE IF NOT EXISTS ConfiguratorProductOption (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productId INTEGER NOT NULL,
    optionId INTEGER NOT NULL,
    isDefault INTEGER DEFAULT 0,
    isRequired INTEGER DEFAULT 0,
    maxQuantity INTEGER DEFAULT 1,
    priceOverride REAL,
    FOREIGN KEY (productId) REFERENCES ConfiguratorProduct(id) ON DELETE CASCADE,
    FOREIGN KEY (optionId) REFERENCES ConfiguratorOption(id) ON DELETE CASCADE,
    UNIQUE(productId, optionId)
  )`,
  
  `CREATE TABLE IF NOT EXISTS ConfiguratorCompatibility (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    optionId INTEGER NOT NULL,
    compatibleId INTEGER NOT NULL,
    isCompatible INTEGER DEFAULT 1,
    message TEXT,
    FOREIGN KEY (optionId) REFERENCES ConfiguratorOption(id) ON DELETE CASCADE,
    FOREIGN KEY (compatibleId) REFERENCES ConfiguratorOption(id) ON DELETE CASCADE,
    UNIQUE(optionId, compatibleId)
  )`,
  
  `CREATE TABLE IF NOT EXISTS SavedConfiguration (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    sessionId TEXT,
    productId INTEGER NOT NULL,
    name TEXT,
    options TEXT,
    totalPrice REAL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`
];

async function createTables() {
  console.log('📡 Conectare la Turso:', process.env.TURSO_DATABASE_URL);
  
  for (const sql of createTableStatements) {
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
    try {
      await client.execute(sql);
      console.log(`✅ Tabel creat: ${tableName}`);
    } catch (err) {
      console.error(`❌ Eroare la ${tableName}:`, err.message);
    }
  }
  
  console.log('\n✅ Tabele create cu succes!');
}

createTables().catch(console.error);
