/*
  Warnings:

  - You are about to drop the column `sipUri` on the `Agent` table. All the data in the column will be lost.
  - The primary key for the `CallLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `firstName` to the `Agent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Agent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phoneNumber` to the `Agent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sipPassword` to the `Agent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sipUname` to the `Agent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `systemCompanyId` to the `Agent` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SIPTech" AS ENUM ('PJSIP', 'SIP', 'SKINNY', 'IAX');

-- AlterTable
ALTER TABLE "Agent" DROP COLUMN "sipUri",
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "phoneNumber" TEXT NOT NULL,
ADD COLUMN     "sipPassword" TEXT NOT NULL,
ADD COLUMN     "sipUname" TEXT NOT NULL,
ADD COLUMN     "systemCompanyId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "CallLog" DROP CONSTRAINT "CallLog_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "CallLog_id_seq";

-- CreateTable
CREATE TABLE "SystemCompany" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "membersCount" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "sIPProviderId" TEXT NOT NULL,

    CONSTRAINT "SystemCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SIPProvider" (
    "id" TEXT NOT NULL,
    "IpHost" INET NOT NULL,
    "IpRange" TEXT NOT NULL,
    "SipUsername" TEXT NOT NULL,
    "SipPassword" TEXT NOT NULL,
    "SipTech" "SIPTech" NOT NULL,
    "AccessToken" TEXT NOT NULL,
    "CallLimit" INTEGER NOT NULL DEFAULT 50,
    "EndpointName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SIPProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RTPAddress" (
    "id" TEXT NOT NULL,
    "RTPAddress" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Remark" TEXT NOT NULL,
    "sIPProviderId" TEXT NOT NULL,

    CONSTRAINT "RTPAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SIPProvider_EndpointName_key" ON "SIPProvider"("EndpointName");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_systemCompanyId_fkey" FOREIGN KEY ("systemCompanyId") REFERENCES "SystemCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemCompany" ADD CONSTRAINT "SystemCompany_sIPProviderId_fkey" FOREIGN KEY ("sIPProviderId") REFERENCES "SIPProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RTPAddress" ADD CONSTRAINT "RTPAddress_sIPProviderId_fkey" FOREIGN KEY ("sIPProviderId") REFERENCES "SIPProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
