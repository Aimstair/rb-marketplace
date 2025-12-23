-- CreateTable
CREATE TABLE "listing_views" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "listingType" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "ipAddress" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listing_views_listingId_idx" ON "listing_views"("listingId");

-- CreateIndex
CREATE INDEX "listing_views_userId_idx" ON "listing_views"("userId");

-- CreateIndex
CREATE INDEX "listing_views_sessionId_idx" ON "listing_views"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "listing_views_listingId_userId_sessionId_key" ON "listing_views"("listingId", "userId", "sessionId");
