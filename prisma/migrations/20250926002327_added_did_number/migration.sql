-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "dIDNumberId" TEXT;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_dIDNumberId_fkey" FOREIGN KEY ("dIDNumberId") REFERENCES "DIDNumbers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
