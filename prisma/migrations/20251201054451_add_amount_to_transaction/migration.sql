-- DropIndex
DROP INDEX "conversations_buyerId_sellerId_listingId_key";

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'ITEM';

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "quantity" INTEGER;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "amount" INTEGER,
ADD COLUMN     "conversationId" TEXT,
ADD COLUMN     "quantity" INTEGER;

-- CreateIndex
CREATE INDEX "conversations_buyerId_idx" ON "conversations"("buyerId");

-- CreateIndex
CREATE INDEX "transactions_conversationId_idx" ON "transactions"("conversationId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
