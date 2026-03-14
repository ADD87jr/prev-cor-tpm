const initSqlJs = require("sql.js");
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const fs = require("fs");

async function restoreProducts() {
  // Găsește cel mai recent backup
  const backupsDir = path.join(__dirname, "..", "backups");
  const backupFiles = fs.readdirSync(backupsDir)
    .filter(f => f.endsWith(".db"))
    .sort()
    .reverse();

  if (backupFiles.length === 0) {
    console.log("❌ Nu există backup-uri în folderul backups/");
    return;
  }

  const latestBackup = path.join(backupsDir, backupFiles[0]);
  console.log(`📦 Restaurare din: ${backupFiles[0]}`);

  // Inițializează SQL.js și deschide backup-ul
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(latestBackup);
  const backupDb = new SQL.Database(fileBuffer);
  
  // Citește produsele din backup
  const result = backupDb.exec("SELECT * FROM Product");
  
  if (result.length === 0 || result[0].values.length === 0) {
    console.log("❌ Nu există produse în backup!");
    backupDb.close();
    return;
  }

  // Convertește rezultatul la obiecte
  const columns = result[0].columns;
  const products = result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
  
  console.log(`📊 Găsite ${products.length} produse în backup`);

  if (products.length === 0) {
    console.log("❌ Nu există produse în backup!");
    backupDb.close();
    return;
  }

  // Conectează la DB curentă
  const prisma = new PrismaClient();

  try {
    // Șterge produsele existente
    await prisma.product.deleteMany();
    console.log("🗑️  Produse existente șterse");

    // Inserează produsele din backup
    let inserted = 0;
    for (const p of products) {
      try {
        await prisma.product.create({
          data: {
            id: p.id,
            name: p.name,
            description: p.description || "",
            price: p.price,
            listPrice: p.listPrice,
            purchasePrice: p.purchasePrice,
            stock: p.stock || 0,
            image: p.image,
            sku: p.sku,
            brand: p.brand,
            manufacturer: p.manufacturer,
            type: p.type || "Altele",
            domain: p.domain || "General",
            deliveryTime: p.deliveryTime,
            couponCode: p.couponCode,
            discount: p.discount,
            discountType: p.discountType,
            advantages: p.advantages,
            // Adaugă alte câmpuri dacă există
          },
        });
        inserted++;
      } catch (err) {
        console.log(`⚠️  Eroare la produsul #${p.id}: ${err.message}`);
      }
    }

    console.log(`✅ ${inserted} produse restaurate cu succes!`);

  } catch (error) {
    console.error("❌ Eroare la restaurare:", error.message);
  } finally {
    await prisma.$disconnect();
    backupDb.close();
  }
}

restoreProducts();
