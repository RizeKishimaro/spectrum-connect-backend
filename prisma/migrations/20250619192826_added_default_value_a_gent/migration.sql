/*
  Warnings:

  - You are about to drop the column `SIPTech` on the `Agent` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Agent" DROP COLUMN "SIPTech",
ADD COLUMN     "SipTech" TEXT NOT NULL DEFAULT 'pjsip';
