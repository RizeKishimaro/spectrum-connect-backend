/*
  Warnings:

  - You are about to drop the column `SipTech` on the `SIPProvider` table. All the data in the column will be lost.
  - Added the required column `sipTech` to the `SIPProvider` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SIPProvider" DROP COLUMN "SipTech",
ADD COLUMN     "sipTech" TEXT NOT NULL;
