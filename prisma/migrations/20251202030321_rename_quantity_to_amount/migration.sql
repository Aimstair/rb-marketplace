/*
  Warnings:

  - You are about to drop the column `quantity` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "messages" DROP COLUMN "quantity",
ADD COLUMN     "amount" INTEGER;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "quantity";
