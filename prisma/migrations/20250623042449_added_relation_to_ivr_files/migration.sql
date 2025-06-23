/*
  Warnings:

  - Added the required column `systemCompanyId` to the `IvrFiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `IvrFiles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "IvrFiles" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "systemCompanyId" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "IvrFiles" ADD CONSTRAINT "IvrFiles_systemCompanyId_fkey" FOREIGN KEY ("systemCompanyId") REFERENCES "SystemCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
