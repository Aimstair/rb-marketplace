-- CreateTable
CREATE TABLE "expiring_keys" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "value" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expiring_keys_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "expiring_keys_expiresAt_idx" ON "expiring_keys"("expiresAt");
