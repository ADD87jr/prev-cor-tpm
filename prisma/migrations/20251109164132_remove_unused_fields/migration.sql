/*
  Warnings:

  - You are about to drop the column `advantages` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `dimensions` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `specs` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `Product` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "purchasePrice" REAL,
    "manufacturer" TEXT,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "stock" INTEGER NOT NULL,
    "sku" TEXT,
    "brand" TEXT,
    "couponCode" TEXT,
    "discount" REAL,
    "discountType" TEXT
);
INSERT INTO "new_Product" ("brand", "couponCode", "description", "discount", "discountType", "domain", "id", "image", "manufacturer", "name", "price", "purchasePrice", "sku", "stock", "type") SELECT "brand", "couponCode", "description", "discount", "discountType", "domain", "id", "image", "manufacturer", "name", "price", "purchasePrice", "sku", "stock", "type" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
