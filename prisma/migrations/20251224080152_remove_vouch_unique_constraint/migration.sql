-- DropIndex
DROP INDEX "vouches_fromUserId_toUserId_key";

-- CreateIndex
CREATE INDEX "vouches_fromUserId_toUserId_idx" ON "vouches"("fromUserId", "toUserId");
