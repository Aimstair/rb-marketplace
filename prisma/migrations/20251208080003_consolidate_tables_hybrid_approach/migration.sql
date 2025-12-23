/*
  Warnings:

  - You are about to drop the `currency_conversations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `currency_listing_votes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `currency_messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `currency_reports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `currency_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `item_conversations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `item_listing_votes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `item_messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `item_reports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `item_transactions` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `listingType` to the `listing_votes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `listingType` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_listingId_fkey";

-- DropForeignKey
ALTER TABLE "currency_conversations" DROP CONSTRAINT "currency_conversations_listingId_fkey";

-- DropForeignKey
ALTER TABLE "currency_listing_votes" DROP CONSTRAINT "currency_listing_votes_listingId_fkey";

-- DropForeignKey
ALTER TABLE "currency_listing_votes" DROP CONSTRAINT "currency_listing_votes_userId_fkey";

-- DropForeignKey
ALTER TABLE "currency_messages" DROP CONSTRAINT "currency_messages_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "currency_reports" DROP CONSTRAINT "currency_reports_listingId_fkey";

-- DropForeignKey
ALTER TABLE "currency_transactions" DROP CONSTRAINT "currency_transactions_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "currency_transactions" DROP CONSTRAINT "currency_transactions_listingId_fkey";

-- DropForeignKey
ALTER TABLE "item_conversations" DROP CONSTRAINT "item_conversations_listingId_fkey";

-- DropForeignKey
ALTER TABLE "item_listing_votes" DROP CONSTRAINT "item_listing_votes_listingId_fkey";

-- DropForeignKey
ALTER TABLE "item_listing_votes" DROP CONSTRAINT "item_listing_votes_userId_fkey";

-- DropForeignKey
ALTER TABLE "item_messages" DROP CONSTRAINT "item_messages_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "item_reports" DROP CONSTRAINT "item_reports_listingId_fkey";

-- DropForeignKey
ALTER TABLE "item_transactions" DROP CONSTRAINT "item_transactions_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "item_transactions" DROP CONSTRAINT "item_transactions_listingId_fkey";

-- DropForeignKey
ALTER TABLE "listing_votes" DROP CONSTRAINT "listing_votes_listingId_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_listingId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_listingId_fkey";

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "listingType" TEXT;

-- AlterTable: Add listingType column as nullable first, set default for existing rows, then make required
ALTER TABLE "listing_votes" ADD COLUMN     "listingType" TEXT;
UPDATE "listing_votes" SET "listingType" = 'OLD';  -- All existing votes are for old Listing model
ALTER TABLE "listing_votes" ALTER COLUMN "listingType" SET NOT NULL;

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "listingType" TEXT;

-- AlterTable: Add listingType column as nullable first, set default for existing rows, then make required
ALTER TABLE "transactions" ADD COLUMN     "listingType" TEXT,
ADD COLUMN     "pricePerUnit" DOUBLE PRECISION,
ADD COLUMN     "totalPrice" INTEGER;
UPDATE "transactions" SET "listingType" = 'OLD';  -- All existing transactions are for old Listing model
ALTER TABLE "transactions" ALTER COLUMN "listingType" SET NOT NULL;

-- DropTable
DROP TABLE "currency_conversations";

-- DropTable
DROP TABLE "currency_listing_votes";

-- DropTable
DROP TABLE "currency_messages";

-- DropTable
DROP TABLE "currency_reports";

-- DropTable
DROP TABLE "currency_transactions";

-- DropTable
DROP TABLE "item_conversations";

-- DropTable
DROP TABLE "item_listing_votes";

-- DropTable
DROP TABLE "item_messages";

-- DropTable
DROP TABLE "item_reports";

-- DropTable
DROP TABLE "item_transactions";

-- CreateIndex
CREATE INDEX "listing_votes_listingType_idx" ON "listing_votes"("listingType");

-- CreateIndex
CREATE INDEX "reports_listingType_idx" ON "reports"("listingType");

-- CreateIndex
CREATE INDEX "transactions_listingType_idx" ON "transactions"("listingType");
