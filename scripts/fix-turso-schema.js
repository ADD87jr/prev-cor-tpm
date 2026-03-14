const { createClient } = require("@libsql/client");
require("dotenv").config({ path: ".env.local" });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function fixSchema() {
  console.log("Fixing SupplierProduct table schema in Turso to match Prisma...\n");
  
  // 1. Check if we need to migrate
  const cols = await turso.execute("PRAGMA table_info(SupplierProduct)");
  const colNames = cols.rows.map(c => c.name);
  
  if (colNames.includes("supplierPrice")) {
    console.log("Schema already correct!");
    return;
  }
  
  console.log("Current columns:", colNames.join(", "));
  
  // 2. Backup data
  const data = await turso.execute("SELECT * FROM SupplierProduct");
  console.log(`Backing up ${data.rows.length} rows...`);
  
  // 3. Drop old table
  await turso.execute("DROP TABLE IF EXISTS SupplierProduct_backup");
  await turso.execute("ALTER TABLE SupplierProduct RENAME TO SupplierProduct_backup");
  console.log("Renamed old table to backup");
  
  // 4. Create new table with correct schema (matching Prisma)
  await turso.execute(`
    CREATE TABLE "SupplierProduct" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "supplierId" INTEGER NOT NULL,
      "productId" INTEGER NOT NULL,
      "supplierCode" TEXT,
      "supplierPrice" REAL NOT NULL DEFAULT 0,
      "currency" TEXT NOT NULL DEFAULT 'EUR',
      "minQuantity" INTEGER NOT NULL DEFAULT 1,
      "deliveryDays" INTEGER,
      "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  console.log("Created new table with correct schema");
  
  // 5. Migrate data
  if (data.rows.length > 0) {
    for (const row of data.rows) {
      await turso.execute({
        sql: `INSERT INTO SupplierProduct (id, supplierId, productId, supplierCode, supplierPrice, currency, minQuantity, deliveryDays, lastUpdated)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [
          row.id,
          row.supplierId,
          row.productId,
          row.supplierCode,
          row.purchasePrice || 0,
          row.currency || 'EUR',
          row.minOrderQty || 1,
          row.leadTimeDays
        ]
      });
    }
    console.log(`Migrated ${data.rows.length} rows`);
  }
  
  // 6. Drop backup
  await turso.execute("DROP TABLE IF EXISTS SupplierProduct_backup");
  console.log("Cleanup done");
  
  // 7. Verify
  const verify = await turso.execute("PRAGMA table_info(SupplierProduct)");
  console.log("\nNew columns:", verify.rows.map(c => c.name).join(", "));
  
  const count = await turso.execute("SELECT COUNT(*) as cnt FROM SupplierProduct");
  console.log(`Total rows: ${count.rows[0].cnt}`);
}

fixSchema().catch(console.error);
