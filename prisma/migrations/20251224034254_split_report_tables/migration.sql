/*
  Warnings:

  - You are about to drop the `reports` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_reportedId_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_reporterId_fkey";

-- DropTable
DROP TABLE "reports";

-- CreateTable
CREATE TABLE "report_listings" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "listingType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_users" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_listings_reporterId_idx" ON "report_listings"("reporterId");

-- CreateIndex
CREATE INDEX "report_listings_listingId_idx" ON "report_listings"("listingId");

-- CreateIndex
CREATE INDEX "report_listings_listingType_idx" ON "report_listings"("listingType");

-- CreateIndex
CREATE INDEX "report_listings_status_idx" ON "report_listings"("status");

-- CreateIndex
CREATE INDEX "report_listings_createdAt_idx" ON "report_listings"("createdAt");

-- CreateIndex
CREATE INDEX "report_users_reporterId_idx" ON "report_users"("reporterId");

-- CreateIndex
CREATE INDEX "report_users_reportedId_idx" ON "report_users"("reportedId");

-- CreateIndex
CREATE INDEX "report_users_status_idx" ON "report_users"("status");

-- CreateIndex
CREATE INDEX "report_users_createdAt_idx" ON "report_users"("createdAt");

-- AddForeignKey
ALTER TABLE "report_listings" ADD CONSTRAINT "report_listings_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_users" ADD CONSTRAINT "report_users_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_users" ADD CONSTRAINT "report_users_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
