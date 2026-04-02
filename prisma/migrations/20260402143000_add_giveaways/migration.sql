-- CreateTable
CREATE TABLE "giveaways" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rewardLabel" TEXT,
    "rewardImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "winnerUserId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "giveaways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "giveaway_entries" (
    "id" TEXT NOT NULL,
    "giveawayId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "giveaway_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "giveaways_status_idx" ON "giveaways"("status");

-- CreateIndex
CREATE INDEX "giveaways_startsAt_idx" ON "giveaways"("startsAt");

-- CreateIndex
CREATE INDEX "giveaways_endsAt_idx" ON "giveaways"("endsAt");

-- CreateIndex
CREATE INDEX "giveaways_winnerUserId_idx" ON "giveaways"("winnerUserId");

-- CreateIndex
CREATE INDEX "giveaways_createdById_idx" ON "giveaways"("createdById");

-- CreateIndex
CREATE INDEX "giveaway_entries_giveawayId_idx" ON "giveaway_entries"("giveawayId");

-- CreateIndex
CREATE INDEX "giveaway_entries_userId_idx" ON "giveaway_entries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "giveaway_entries_giveawayId_userId_key" ON "giveaway_entries"("giveawayId", "userId");

-- AddForeignKey
ALTER TABLE "giveaways" ADD CONSTRAINT "giveaways_winnerUserId_fkey" FOREIGN KEY ("winnerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giveaways" ADD CONSTRAINT "giveaways_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giveaway_entries" ADD CONSTRAINT "giveaway_entries_giveawayId_fkey" FOREIGN KEY ("giveawayId") REFERENCES "giveaways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giveaway_entries" ADD CONSTRAINT "giveaway_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
