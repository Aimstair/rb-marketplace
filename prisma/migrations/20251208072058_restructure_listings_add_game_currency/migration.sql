-- CreateTable
CREATE TABLE "item_listings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "gameName" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 1,
    "image" TEXT NOT NULL,
    "listingType" TEXT NOT NULL DEFAULT 'Item',
    "category" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_listing_votes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_listing_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_listings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "gameName" TEXT NOT NULL,
    "currencyName" TEXT NOT NULL,
    "listingType" TEXT NOT NULL DEFAULT 'Currency',
    "ratePerPeso" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL,
    "minOrder" INTEGER NOT NULL,
    "maxOrder" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currency_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_listing_votes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currency_listing_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_conversations" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "offerAmount" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "offerStatus" TEXT DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_transactions" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "conversationId" TEXT,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "buyerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "sellerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_conversations" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currency_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "offerAmount" INTEGER,
    "amount" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "offerStatus" TEXT DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currency_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_transactions" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "conversationId" TEXT,
    "amount" INTEGER NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "buyerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "sellerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currency_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT,
    "listingId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT,
    "listingId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currency_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_currencies" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_currencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_listings_sellerId_idx" ON "item_listings"("sellerId");

-- CreateIndex
CREATE INDEX "item_listings_status_idx" ON "item_listings"("status");

-- CreateIndex
CREATE INDEX "item_listings_gameName_idx" ON "item_listings"("gameName");

-- CreateIndex
CREATE INDEX "item_listings_category_idx" ON "item_listings"("category");

-- CreateIndex
CREATE INDEX "item_listing_votes_userId_idx" ON "item_listing_votes"("userId");

-- CreateIndex
CREATE INDEX "item_listing_votes_listingId_idx" ON "item_listing_votes"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "item_listing_votes_userId_listingId_key" ON "item_listing_votes"("userId", "listingId");

-- CreateIndex
CREATE INDEX "currency_listings_sellerId_idx" ON "currency_listings"("sellerId");

-- CreateIndex
CREATE INDEX "currency_listings_status_idx" ON "currency_listings"("status");

-- CreateIndex
CREATE INDEX "currency_listings_gameName_idx" ON "currency_listings"("gameName");

-- CreateIndex
CREATE INDEX "currency_listings_currencyName_idx" ON "currency_listings"("currencyName");

-- CreateIndex
CREATE INDEX "currency_listing_votes_userId_idx" ON "currency_listing_votes"("userId");

-- CreateIndex
CREATE INDEX "currency_listing_votes_listingId_idx" ON "currency_listing_votes"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "currency_listing_votes_userId_listingId_key" ON "currency_listing_votes"("userId", "listingId");

-- CreateIndex
CREATE INDEX "item_conversations_buyerId_idx" ON "item_conversations"("buyerId");

-- CreateIndex
CREATE INDEX "item_conversations_sellerId_idx" ON "item_conversations"("sellerId");

-- CreateIndex
CREATE INDEX "item_conversations_listingId_idx" ON "item_conversations"("listingId");

-- CreateIndex
CREATE INDEX "item_messages_conversationId_idx" ON "item_messages"("conversationId");

-- CreateIndex
CREATE INDEX "item_messages_senderId_idx" ON "item_messages"("senderId");

-- CreateIndex
CREATE INDEX "item_transactions_buyerId_idx" ON "item_transactions"("buyerId");

-- CreateIndex
CREATE INDEX "item_transactions_sellerId_idx" ON "item_transactions"("sellerId");

-- CreateIndex
CREATE INDEX "item_transactions_listingId_idx" ON "item_transactions"("listingId");

-- CreateIndex
CREATE INDEX "currency_conversations_buyerId_idx" ON "currency_conversations"("buyerId");

-- CreateIndex
CREATE INDEX "currency_conversations_sellerId_idx" ON "currency_conversations"("sellerId");

-- CreateIndex
CREATE INDEX "currency_conversations_listingId_idx" ON "currency_conversations"("listingId");

-- CreateIndex
CREATE INDEX "currency_messages_conversationId_idx" ON "currency_messages"("conversationId");

-- CreateIndex
CREATE INDEX "currency_messages_senderId_idx" ON "currency_messages"("senderId");

-- CreateIndex
CREATE INDEX "currency_transactions_buyerId_idx" ON "currency_transactions"("buyerId");

-- CreateIndex
CREATE INDEX "currency_transactions_sellerId_idx" ON "currency_transactions"("sellerId");

-- CreateIndex
CREATE INDEX "currency_transactions_listingId_idx" ON "currency_transactions"("listingId");

-- CreateIndex
CREATE INDEX "item_reports_reporterId_idx" ON "item_reports"("reporterId");

-- CreateIndex
CREATE INDEX "item_reports_listingId_idx" ON "item_reports"("listingId");

-- CreateIndex
CREATE INDEX "currency_reports_reporterId_idx" ON "currency_reports"("reporterId");

-- CreateIndex
CREATE INDEX "currency_reports_listingId_idx" ON "currency_reports"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "games_name_key" ON "games"("name");

-- CreateIndex
CREATE INDEX "games_isActive_idx" ON "games"("isActive");

-- CreateIndex
CREATE INDEX "games_order_idx" ON "games"("order");

-- CreateIndex
CREATE INDEX "game_currencies_gameId_idx" ON "game_currencies"("gameId");

-- CreateIndex
CREATE INDEX "game_currencies_isActive_idx" ON "game_currencies"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "game_currencies_gameId_name_key" ON "game_currencies"("gameId", "name");

-- CreateIndex
CREATE INDEX "listings_type_idx" ON "listings"("type");

-- CreateIndex
CREATE INDEX "listings_status_idx" ON "listings"("status");

-- AddForeignKey
ALTER TABLE "item_listings" ADD CONSTRAINT "item_listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_listing_votes" ADD CONSTRAINT "item_listing_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_listing_votes" ADD CONSTRAINT "item_listing_votes_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "item_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_listings" ADD CONSTRAINT "currency_listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_listing_votes" ADD CONSTRAINT "currency_listing_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_listing_votes" ADD CONSTRAINT "currency_listing_votes_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "currency_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_conversations" ADD CONSTRAINT "item_conversations_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "item_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_messages" ADD CONSTRAINT "item_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "item_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_transactions" ADD CONSTRAINT "item_transactions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "item_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_transactions" ADD CONSTRAINT "item_transactions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "item_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_conversations" ADD CONSTRAINT "currency_conversations_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "currency_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_messages" ADD CONSTRAINT "currency_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "currency_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "currency_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "currency_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_reports" ADD CONSTRAINT "item_reports_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "item_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_reports" ADD CONSTRAINT "currency_reports_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "currency_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_currencies" ADD CONSTRAINT "game_currencies_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
