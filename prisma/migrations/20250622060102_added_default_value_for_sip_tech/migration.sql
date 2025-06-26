/*
  Warnings:

  - You are about to drop the column `sipTech` on the `SIPProvider` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SIPProvider" DROP COLUMN "sipTech",
ADD COLUMN     "SipTech" TEXT NOT NULL DEFAULT 'pjsip';

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "isSMSSubscribed" BOOLEAN;
