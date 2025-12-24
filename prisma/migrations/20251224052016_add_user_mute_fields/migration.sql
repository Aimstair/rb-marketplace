-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isMuted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mutedReason" TEXT,
ADD COLUMN     "mutedUntil" TIMESTAMP(3);
