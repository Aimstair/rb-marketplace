-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'MEDIUM';
