/*
  Warnings:

  - You are about to drop the column `isInPredictiveDialer` on the `Agent` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Agent" DROP COLUMN "isInPredictiveDialer";

-- CreateTable
CREATE TABLE "AgentInformation" (
    "id" TEXT NOT NULL,
    "isInPredictiveDialer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentInformation_pkey" PRIMARY KEY ("id")
);
