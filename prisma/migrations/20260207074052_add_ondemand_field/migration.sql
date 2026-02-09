-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "price" REAL NOT NULL,
    "listPrice" REAL,
    "purchasePrice" REAL,
    "manufacturer" TEXT,
    "description" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "image" TEXT NOT NULL,
    "images" JSONB,
    "type" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "stock" INTEGER NOT NULL,
    "onDemand" BOOLEAN NOT NULL DEFAULT false,
    "sku" TEXT,
    "brand" TEXT,
    "variants" JSONB,
    "deliveryTime" TEXT,
    "deliveryTimeEn" TEXT,
    "specs" JSONB,
    "specsEn" JSONB,
    "advantages" JSONB,
    "advantagesEn" JSONB,
    "couponCode" TEXT,
    "discount" REAL,
    "discountType" TEXT,
    "pdfUrl" TEXT,
    "safetySheetUrl" TEXT
);
INSERT INTO "new_Product" ("advantages", "advantagesEn", "brand", "couponCode", "deliveryTime", "deliveryTimeEn", "description", "descriptionEn", "discount", "discountType", "domain", "id", "image", "images", "listPrice", "manufacturer", "name", "nameEn", "pdfUrl", "price", "purchasePrice", "safetySheetUrl", "sku", "specs", "specsEn", "stock", "type", "variants") SELECT "advantages", "advantagesEn", "brand", "couponCode", "deliveryTime", "deliveryTimeEn", "description", "descriptionEn", "discount", "discountType", "domain", "id", "image", "images", "listPrice", "manufacturer", "name", "nameEn", "pdfUrl", "price", "purchasePrice", "safetySheetUrl", "sku", "specs", "specsEn", "stock", "type", "variants" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
