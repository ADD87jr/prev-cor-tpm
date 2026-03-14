/**
 * Import produse din Excel (format Sauter sau similar)
 * 
 * Utilizare:
 *   node scripts/import-products-excel.js "cale/catre/fisier.xlsx" [--dry-run] [--supplier=15]
 *   node scripts/import-products-excel.js --auto   (importă toate fișierele din data/imports/)
 * 
 * Opțiuni:
 *   --dry-run       Doar afișează ce ar importa, fără a scrie în DB
 *   --auto          Importă automat toate fișierele .xlsx din data/imports/
 *   --supplier=ID   ID-ul furnizorului (default: detectează automat sau 15 pentru Sauter)
 *   --sheet=NAME    Numele sheet-ului (default: primul sheet)
 */

const XLSX = require("xlsx");
const { createClient } = require("@libsql/client");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: ".env.local" });

// Conexiuni DB
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});
const local = createClient({ url: "file:prisma/dev.db" });

// Folder pentru import automat
const IMPORTS_DIR = path.join(__dirname, "..", "data", "imports");

// Parsare argumente
const args = process.argv.slice(2);
const autoMode = args.includes("--auto");
let filePath = args.find(a => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const supplierArg = args.find(a => a.startsWith("--supplier="));
const sheetArg = args.find(a => a.startsWith("--sheet="));
const supplierId = supplierArg ? parseInt(supplierArg.split("=")[1]) : null; // Auto-detect
const sheetName = sheetArg ? sheetArg.split("=")[1] : null;

// Mapare coloane Excel -> câmpuri DB (case-insensitive)
const COLUMN_MAP = {
  // SKU / Cod produs
  "type": "sku",
  "cod": "sku", 
  "sku": "sku",
  "cod produs": "sku",
  "product code": "sku",
  "article": "sku",
  "art.no": "sku",
  "art. no": "sku",
  "articol": "sku",
  
  // Denumire
  "description en": "nameEn",
  "description": "nameEn",
  "denumire": "name",
  "name": "name",
  "product name": "name",
  "nume produs": "name",
  
  // Preț
  "epl 2026": "listPrice",
  "epl2026": "listPrice",
  "price": "listPrice",
  "pret": "listPrice",
  "list price": "listPrice",
  "euro": "currency",
  "currency": "currency",
  "moneda": "currency",
  
  // Categorie
  "category": "type",
  "categorie": "type",
  "product group": "domain",
  "grup produs": "domain",
  "group of budgets": "specs_budgetGroup",
  
  // Alte câmpuri
  "weight": "specs_weight",
  "greutate": "specs_weight",
  "origin": "specs_origin",
  "origine": "specs_origin",
  "customs n": "specs_customsCode",
  "cod vamal": "specs_customsCode",
  "release code": "specs_releaseCode",
  "dat code": "specs_datCode",
  "pref.": "specs_preference"
};

// Detectare automată mapare coloane
function detectColumnMapping(headers) {
  const mapping = {};
  
  for (const header of headers) {
    const headerLower = header.toLowerCase().trim();
    
    for (const [excelCol, dbField] of Object.entries(COLUMN_MAP)) {
      if (headerLower === excelCol || headerLower.includes(excelCol)) {
        mapping[header] = dbField;
        break;
      }
    }
  }
  
  return mapping;
}

// Procesare rând Excel -> obiect produs
function rowToProduct(row, mapping, supplierId) {
  const product = {
    sku: null,
    name: null,
    nameEn: null,
    price: 0,
    listPrice: null,
    purchasePrice: null,
    currency: "EUR",
    manufacturer: "Sauter",
    description: "",
    descriptionEn: "",
    image: "/products/placeholder.jpg",
    type: "Components",
    domain: "HVAC",
    stock: 0,
    onDemand: true,
    specs: {}
  };
  
  for (const [excelCol, value] of Object.entries(row)) {
    const dbField = mapping[excelCol];
    if (!dbField || value === undefined || value === null || value === "") continue;
    
    if (dbField.startsWith("specs_")) {
      // Câmpuri pentru specs JSON
      const specKey = dbField.replace("specs_", "");
      product.specs[specKey] = String(value).trim();
    } else if (dbField === "listPrice" || dbField === "price" || dbField === "purchasePrice") {
      // Parsare preț
      let price = value;
      if (typeof price === "string") {
        price = parseFloat(price.replace(/[^\d.,]/g, "").replace(",", "."));
      }
      if (!isNaN(price)) {
        product[dbField] = price;
        if (dbField === "listPrice") {
          product.price = price; // Setează și prețul principal
        }
      }
    } else if (dbField === "currency") {
      product.currency = String(value).trim().toUpperCase();
      if (product.currency === "EURO") product.currency = "EUR";
    } else {
      product[dbField] = String(value).trim();
    }
  }
  
  // Setări default pentru câmpuri lipsă
  if (!product.name && product.nameEn) {
    product.name = product.nameEn;
  }
  if (!product.nameEn && product.name) {
    product.nameEn = product.name;
  }
  if (!product.description) {
    product.description = product.name || "";
  }
  if (!product.descriptionEn) {
    product.descriptionEn = product.nameEn || product.description;
  }
  
  // Convertește specs la JSON string
  product.specsJson = Object.keys(product.specs).length > 0 
    ? JSON.stringify(Object.entries(product.specs).map(([k, v]) => `${k}: ${v}`))
    : null;
  
  return product;
}

// Validare produs
function validateProduct(product, rowIndex) {
  const errors = [];
  
  if (!product.sku) {
    errors.push(`Rând ${rowIndex}: SKU lipsă`);
  }
  if (!product.name) {
    errors.push(`Rând ${rowIndex}: Denumire lipsă`);
  }
  if (product.price <= 0 && product.listPrice <= 0) {
    errors.push(`Rând ${rowIndex}: Preț invalid (${product.price})`);
  }
  
  return errors;
}

// Import în baza de date
async function importProduct(db, product, supplierId) {
  const now = new Date().toISOString();
  
  // Verifică dacă există deja (după SKU)
  const existing = await db.execute({
    sql: "SELECT id FROM Product WHERE sku = ?",
    args: [product.sku]
  });
  
  if (existing.rows.length > 0) {
    // Update
    await db.execute({
      sql: `UPDATE Product SET 
        name = ?, nameEn = ?, price = ?, listPrice = ?, currency = ?,
        manufacturer = ?, description = ?, descriptionEn = ?,
        type = ?, domain = ?, specs = ?, onDemand = ?
        WHERE sku = ?`,
      args: [
        product.name, product.nameEn, product.price, product.listPrice, product.currency,
        product.manufacturer, product.description, product.descriptionEn,
        product.type, product.domain, product.specsJson, product.onDemand ? 1 : 0,
        product.sku
      ]
    });
    return { action: "updated", id: existing.rows[0].id };
  } else {
    // Insert
    const result = await db.execute({
      sql: `INSERT INTO Product (
        name, nameEn, price, listPrice, currency, manufacturer,
        description, descriptionEn, image, type, domain, stock, onDemand, sku, specs
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        product.name, product.nameEn, product.price, product.listPrice, product.currency,
        product.manufacturer, product.description, product.descriptionEn,
        product.image, product.type, product.domain, product.stock, product.onDemand ? 1 : 0,
        product.sku, product.specsJson
      ]
    });
    
    // Legătură cu furnizorul (SupplierProduct)
    if (supplierId && result.lastInsertRowid) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO SupplierProduct (supplierId, productId, supplierCode, supplierPrice, currency, lastUpdated)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [supplierId, result.lastInsertRowid, product.sku, product.listPrice || product.price, product.currency, now]
      });
    }
    
    return { action: "inserted", id: result.lastInsertRowid };
  }
}

// Main
async function main() {
  // Mod automat - caută fișiere în data/imports/
  if (autoMode || !filePath) {
    if (!fs.existsSync(IMPORTS_DIR)) {
      fs.mkdirSync(IMPORTS_DIR, { recursive: true });
    }
    
    const files = fs.readdirSync(IMPORTS_DIR).filter(f => f.endsWith(".xlsx") || f.endsWith(".xls"));
    
    if (files.length === 0) {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║           IMPORT PRODUSE DIN EXCEL                          ║
╠══════════════════════════════════════════════════════════════╣
║ Utilizare:                                                   ║
║   1. Pune fișierele .xlsx în: data/imports/                  ║
║   2. Rulează: node scripts/import-products-excel.js --auto   ║
║                                                              ║
║ SAU specifică un fișier direct:                              ║
║   node scripts/import-products-excel.js "cale/fisier.xlsx"   ║
║                                                              ║
║ Opțiuni:                                                     ║
║   --dry-run        Doar preview, fără import                 ║
║   --auto           Importă toate fișierele din data/imports/ ║
║   --supplier=ID    ID furnizor (auto-detectat din nume)      ║
║   --sheet=NAME     Nume sheet specific                       ║
╚══════════════════════════════════════════════════════════════╝

📁 Folder pentru import: ${IMPORTS_DIR}
⚠️  Niciun fișier .xlsx găsit în folder!
      `);
      process.exit(1);
    }
    
    console.log(`\n🔄 MOD AUTOMAT - ${files.length} fișier(e) găsite în data/imports/\n`);
    
    for (const file of files) {
      console.log(`\n${"═".repeat(60)}`);
      filePath = path.join(IMPORTS_DIR, file);
      await processFile(filePath);
    }
    
    return;
  }
  
  await processFile(filePath);
}

// Detectare furnizor din numele fișierului
function detectSupplierFromFilename(filename) {
  const name = path.basename(filename).toLowerCase();
  const suppliers = {
    "sauter": 15,
    "siemens": 14,
    "velleman": 1,
    "tme": 2,
    "megateh": 3,
    "rs": 4,
    "farnell": 5,
    "automation24": 6,
    "elmark": 7,
    "mouser": 8,
    "conrad": 9,
    "vikiwat": 10,
    "klinkmann": 11,
    "aurocon": 12,
    "mlc": 13
  };
  
  for (const [key, id] of Object.entries(suppliers)) {
    if (name.includes(key)) return id;
  }
  return null;
}

// Detectare manufacturer din numele fișierului
function detectManufacturerFromFilename(filename) {
  const name = path.basename(filename).toLowerCase();
  if (name.includes("sauter")) return "Sauter";
  if (name.includes("siemens")) return "Siemens";
  if (name.includes("honeywell")) return "Honeywell";
  if (name.includes("schneider")) return "Schneider Electric";
  if (name.includes("abb")) return "ABB";
  return null;
}

// Procesare un fișier
async function processFile(inputPath) {
  const fullPath = path.resolve(inputPath);
  const detectedSupplierId = supplierId || detectSupplierFromFilename(fullPath);
  const detectedManufacturer = detectManufacturerFromFilename(fullPath);
  
  console.log(`📁 Fișier: ${path.basename(fullPath)}`);
  console.log(`🏭 Furnizor ID: ${detectedSupplierId || "nedetectat"}`);
  console.log(`�icing Manufacturer: ${detectedManufacturer || "din Excel"}`);
  console.log(`${dryRun ? "🔍 MOD DRY-RUN" : "💾 MOD IMPORT REAL"}\n`);
  
  // Citește Excel
  let workbook;
  try {
    workbook = XLSX.readFile(fullPath);
  } catch (err) {
    console.error("❌ Eroare la citirea fișierului:", err.message);
    return { error: err.message };
  }
  
  // Selectează sheet
  const sheet = sheetName || workbook.SheetNames[0];
  console.log(`📄 Sheet: ${sheet}`);
  console.log(`📋 Sheet-uri disponibile: ${workbook.SheetNames.join(", ")}\n`);
  
  const worksheet = workbook.Sheets[sheet];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (data.length < 2) {
    console.error("❌ Fișierul nu conține date suficiente");
    process.exit(1);
  }
  
  // Detectează header-ul (prima linie cu date relevante)
  let headerRow = 0;
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    if (row && row.some(cell => {
      const cellStr = String(cell || "").toLowerCase();
      return cellStr.includes("type") || cellStr.includes("description") || 
             cellStr.includes("price") || cellStr.includes("sku") || cellStr.includes("cod");
    })) {
      headerRow = i;
      break;
    }
  }
  
  const headers = data[headerRow].map(h => String(h || "").trim());
  console.log(`📊 Headers detectate (rând ${headerRow + 1}):`, headers.slice(0, 10).join(", "), "...");
  
  // Detectează maparea
  const mapping = detectColumnMapping(headers);
  console.log(`🔗 Mapare detectată:`, Object.entries(mapping).map(([k, v]) => `${k}→${v}`).join(", "));
  
  // Convertește la JSON cu headers
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerRow });
  console.log(`\n📦 Total rânduri de procesat: ${jsonData.length}\n`);
  
  // Procesare
  const products = [];
  const allErrors = [];
  
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    const product = rowToProduct(row, mapping, detectedSupplierId);
    // Override manufacturer dacă e detectat din filename
    if (detectedManufacturer) {
      product.manufacturer = detectedManufacturer;
    }
    const errors = validateProduct(product, i + headerRow + 2);
    
    if (errors.length > 0) {
      allErrors.push(...errors);
    } else {
      products.push(product);
    }
  }
  
  console.log(`✅ Produse valide: ${products.length}`);
  console.log(`⚠️  Rânduri cu erori: ${allErrors.length}`);
  
  if (allErrors.length > 0 && allErrors.length <= 10) {
    console.log("\nErori:");
    allErrors.forEach(e => console.log(`  - ${e}`));
  }
  
  // Preview primele 5 produse
  console.log("\n📋 Preview primele 5 produse:");
  products.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.sku}] ${p.name?.slice(0, 50)}... | ${p.price} ${p.currency}`);
  });
  
  if (dryRun) {
    console.log("\n🔍 Dry-run complet. Folosește fără --dry-run pentru import real.");
    return;
  }
  
  // Import real
  console.log("\n💾 Import în baze de date...");
  
  let inserted = 0, updated = 0, errors = 0;
  
  for (const product of products) {
    try {
      // Import în ambele baze de date
      const r1 = await importProduct(turso, product, detectedSupplierId);
      await importProduct(local, product, detectedSupplierId);
      
      if (r1.action === "inserted") inserted++;
      else updated++;
      
      process.stdout.write(`\r  Progres: ${inserted + updated + errors}/${products.length}`);
    } catch (err) {
      errors++;
      console.error(`\n  ❌ Eroare la ${product.sku}: ${err.message}`);
    }
  }
  
  console.log(`\n\n✅ Import finalizat!`);
  console.log(`   - Inserate: ${inserted}`);
  console.log(`   - Actualizate: ${updated}`);
  console.log(`   - Erori: ${errors}`);
}

main().catch(console.error);
