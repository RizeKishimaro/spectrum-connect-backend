/*
  Warnings:

  - You are about to drop the column `assignedAgentId` on the `CallSession` table. All the data in the column will be lost.
  - Added the required column `type` to the `CallSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CallSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "CallStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "CallSession" DROP COLUMN "assignedAgentId",
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
