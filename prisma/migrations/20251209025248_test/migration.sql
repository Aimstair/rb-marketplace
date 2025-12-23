/*
  Warnings:

  - You are about to drop the column `gameName` on the `item_listings` table. All the data in the column will be lost.
  - Made the column `gameId` on table `item_listings` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "item_listings" DROP COLUMN "gameName",
ALTER COLUMN "gameId" SET NOT NULL;
