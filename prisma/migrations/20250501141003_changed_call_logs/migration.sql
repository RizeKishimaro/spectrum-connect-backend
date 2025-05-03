/*
  Warnings:

  - Added the required column `direction` to the `CallLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `CallLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `systemName` to the `CallLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CallLog` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CallDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CallStatus" ADD VALUE 'MISSED';
ALTER TYPE "CallStatus" ADD VALUE 'TRANSFERRED';

-- AlterTable
ALTER TABLE "CallLog" ADD COLUMN     "agentId" TEXT,
ADD COLUMN     "calleeId" TEXT,
ADD COLUMN     "direction" "CallDirection" NOT NULL,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "hungUpBy" TEXT,
ADD COLUMN     "status" "CallStatus" NOT NULL,
ADD COLUMN     "systemName" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "action" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
