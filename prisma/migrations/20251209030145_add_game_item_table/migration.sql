/*
  Warnings:

  - You are about to drop the column `category` on the `item_listings` table. All the data in the column will be lost.
  - You are about to drop the column `itemType` on the `item_listings` table. All the data in the column will be lost.
  - Added the required column `gameItemId` to the `item_listings` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "item_listings_category_idx";

-- AlterTable
ALTER TABLE "item_listings" DROP COLUMN "category",
DROP COLUMN "itemType",
ADD COLUMN     "gameItemId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "game_items" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_items_gameId_idx" ON "game_items"("gameId");

-- CreateIndex
CREATE INDEX "game_items_isActive_idx" ON "game_items"("isActive");

-- CreateIndex
CREATE INDEX "game_items_category_idx" ON "game_items"("category");

-- CreateIndex
CREATE UNIQUE INDEX "game_items_gameId_name_key" ON "game_items"("gameId", "name");

-- CreateIndex
CREATE INDEX "item_listings_gameItemId_idx" ON "item_listings"("gameItemId");

-- AddForeignKey
ALTER TABLE "item_listings" ADD CONSTRAINT "item_listings_gameItemId_fkey" FOREIGN KEY ("gameItemId") REFERENCES "game_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_items" ADD CONSTRAINT "game_items_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
