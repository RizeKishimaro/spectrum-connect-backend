/*
  Warnings:

  - You are about to drop the column `createdAt` on the `TelegramChat` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `TelegramChat` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TelegramChat" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- CreateTable
CREATE TABLE "TelegramDIDNumbers" (
    "id" TEXT NOT NULL,
    "didNumber" TEXT NOT NULL,
    "systemCompanyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramDIDNumbers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TelegramDIDNumbers" ADD CONSTRAINT "TelegramDIDNumbers_systemCompanyId_fkey" FOREIGN KEY ("systemCompanyId") REFERENCES "SystemCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
