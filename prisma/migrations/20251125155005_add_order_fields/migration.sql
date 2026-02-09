-- AlterTable
ALTER TABLE "Order" ADD COLUMN "courierType" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryLabel" TEXT;
ALTER TABLE "Order" ADD COLUMN "reducereTotala" REAL;
ALTER TABLE "Order" ADD COLUMN "subtotalDupaReduceri" REAL;
ALTER TABLE "Order" ADD COLUMN "subtotalPretVanzare" REAL;
ALTER TABLE "Order" ADD COLUMN "tva" REAL;
