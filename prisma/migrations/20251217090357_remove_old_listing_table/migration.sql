/*
  Warnings:

  - You are about to drop the `listings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "listings" DROP CONSTRAINT "listings_sellerId_fkey";

-- DropTable
DROP TABLE "listings";
