/*
  Warnings:

  - Added the required column `companyMembersId` to the `CRMAppointment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CRMAppointment" ADD COLUMN     "companyMembersId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CompanyMembers" ADD COLUMN     "cRMAppointmentId" TEXT;

-- AddForeignKey
ALTER TABLE "CRMAppointment" ADD CONSTRAINT "CRMAppointment_companyMembersId_fkey" FOREIGN KEY ("companyMembersId") REFERENCES "CompanyMembers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
