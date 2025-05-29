/*
  Warnings:

  - Added the required column `agentCount` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roles` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `systemCompanyId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'company_user');

-- DropForeignKey
ALTER TABLE "CallLog" DROP CONSTRAINT "CallLog_userId_fkey";

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "agentCount" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "roles" "Role" NOT NULL,
ADD COLUMN     "systemCompanyId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_systemCompanyId_fkey" FOREIGN KEY ("systemCompanyId") REFERENCES "SystemCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
