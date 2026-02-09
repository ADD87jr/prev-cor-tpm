-- AlterTable
ALTER TABLE "Order" ADD COLUMN "statusUpdatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "deliveryTime" TEXT;
