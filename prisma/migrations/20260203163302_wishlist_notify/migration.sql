-- CreateTable
CREATE TABLE "Wishlist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "items" JSONB NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_email_key" ON "Wishlist"("email");
