-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileVisibility" BOOLEAN NOT NULL DEFAULT true,
    "showEmail" BOOLEAN NOT NULL DEFAULT false,
    "showRobloxProfile" BOOLEAN NOT NULL DEFAULT true,
    "showActivityStatus" BOOLEAN NOT NULL DEFAULT true,
    "allowMessageRequests" BOOLEAN NOT NULL DEFAULT true,
    "notifyNewMessages" BOOLEAN NOT NULL DEFAULT true,
    "notifyListingViews" BOOLEAN NOT NULL DEFAULT true,
    "notifyPriceAlerts" BOOLEAN NOT NULL DEFAULT false,
    "notifyVouches" BOOLEAN NOT NULL DEFAULT true,
    "notifyTradeUpdates" BOOLEAN NOT NULL DEFAULT true,
    "notifyMarketingEmails" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
