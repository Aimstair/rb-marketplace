-- Composite indexes for the hottest read paths (header counts, chat, marketplace, profiles, trends).
-- IF NOT EXISTS keeps this safe if an index was already created by hand.

CREATE INDEX IF NOT EXISTS "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "messages_conversationId_isRead_senderId_idx" ON "messages"("conversationId", "isRead", "senderId");

CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "conversations_buyerId_updatedAt_idx" ON "conversations"("buyerId", "updatedAt");
CREATE INDEX IF NOT EXISTS "conversations_sellerId_updatedAt_idx" ON "conversations"("sellerId", "updatedAt");

CREATE INDEX IF NOT EXISTS "transactions_status_createdAt_idx" ON "transactions"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "transactions_buyerId_status_idx" ON "transactions"("buyerId", "status");
CREATE INDEX IF NOT EXISTS "transactions_sellerId_status_idx" ON "transactions"("sellerId", "status");

CREATE INDEX IF NOT EXISTS "item_listings_status_createdAt_idx" ON "item_listings"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "item_listings_sellerId_status_idx" ON "item_listings"("sellerId", "status");

CREATE INDEX IF NOT EXISTS "currency_listings_sellerId_status_idx" ON "currency_listings"("sellerId", "status");

CREATE INDEX IF NOT EXISTS "vouches_toUserId_status_idx" ON "vouches"("toUserId", "status");
