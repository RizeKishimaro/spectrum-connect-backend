/*
  Warnings:

  - Added the required column `systemCompanyId` to the `CRMAppointmentStatus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `systemCompanyId` to the `Services` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CRMAppointmentStatus" ADD COLUMN     "systemCompanyId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Services" ADD COLUMN     "systemCompanyId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "CRMAppointmentStatus" ADD CONSTRAINT "CRMAppointmentStatus_systemCompanyId_fkey" FOREIGN KEY ("systemCompanyId") REFERENCES "SystemCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Services" ADD CONSTRAINT "Services_systemCompanyId_fkey" FOREIGN KEY ("systemCompanyId") REFERENCES "SystemCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
