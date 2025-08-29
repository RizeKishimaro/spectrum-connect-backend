/*
  Warnings:

  - You are about to drop the column `services` on the `CRMLeads` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CRMLeads" DROP COLUMN "services";

-- AlterTable
ALTER TABLE "Services" ADD COLUMN     "cRMLeadsId" TEXT;

-- AddForeignKey
ALTER TABLE "Services" ADD CONSTRAINT "Services_cRMLeadsId_fkey" FOREIGN KEY ("cRMLeadsId") REFERENCES "CRMLeads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
