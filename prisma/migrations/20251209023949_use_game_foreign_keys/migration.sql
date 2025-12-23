/*
  Warnings:

  - You are about to drop the column `currencyName` on the `currency_listings` table. All the data in the column will be lost.
  - You are about to drop the column `gameName` on the `currency_listings` table. All the data in the column will be lost.
  - You are about to drop the column `gameName` on the `item_listings` table. All the data in the column will be lost.
  - Added the required column `gameCurrencyId` to the `currency_listings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gameId` to the `currency_listings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gameId` to the `item_listings` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "currency_listings_currencyName_idx";

-- DropIndex
DROP INDEX "currency_listings_gameName_idx";

-- DropIndex
DROP INDEX "item_listings_gameName_idx";

-- AlterTable: Add columns as nullable first, populate data, then make required
ALTER TABLE "currency_listings" 
ADD COLUMN "gameCurrencyId" TEXT,
ADD COLUMN "gameId" TEXT;

-- Update existing listings with correct foreign keys
-- Blox Fruits - Fragments listings (2 records)
UPDATE "currency_listings" 
SET "gameId" = 'cmiwts6c0000a10ufpc09liem',
    "gameCurrencyId" = 'cmiwts6c2000c10ufjkwxiwyd'
WHERE "gameName" = 'Blox Fruits' AND "currencyName" = 'Fragments';

-- Pet Simulator X - Gems listing (1 record)
UPDATE "currency_listings" 
SET "gameId" = 'cmiwts6ca000h10uf1vb6eewe',
    "gameCurrencyId" = 'cmiwts6cb000j10uffe0mg9s3'
WHERE "gameName" = 'Pet Simulator X' AND "currencyName" = 'Gems';

-- Make columns required after populating
ALTER TABLE "currency_listings" 
ALTER COLUMN "gameCurrencyId" SET NOT NULL,
ALTER COLUMN "gameId" SET NOT NULL;

-- Drop old columns
ALTER TABLE "currency_listings" 
DROP COLUMN "currencyName",
DROP COLUMN "gameName";

-- AlterTable: For item_listings, use default first game (we have no existing data)
ALTER TABLE "item_listings" 
ADD COLUMN "gameId" TEXT;

-- CreateIndex
CREATE INDEX "currency_listings_gameId_idx" ON "currency_listings"("gameId");

-- CreateIndex
CREATE INDEX "currency_listings_gameCurrencyId_idx" ON "currency_listings"("gameCurrencyId");

-- CreateIndex
CREATE INDEX "item_listings_gameId_idx" ON "item_listings"("gameId");

-- AddForeignKey
ALTER TABLE "item_listings" ADD CONSTRAINT "item_listings_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_listings" ADD CONSTRAINT "currency_listings_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_listings" ADD CONSTRAINT "currency_listings_gameCurrencyId_fkey" FOREIGN KEY ("gameCurrencyId") REFERENCES "game_currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
