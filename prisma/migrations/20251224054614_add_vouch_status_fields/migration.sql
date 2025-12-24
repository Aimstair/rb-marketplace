-- AlterTable
ALTER TABLE "vouches" ADD COLUMN     "invalidReason" TEXT,
ADD COLUMN     "invalidatedAt" TIMESTAMP(3),
ADD COLUMN     "invalidatedBy" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'VALID';
