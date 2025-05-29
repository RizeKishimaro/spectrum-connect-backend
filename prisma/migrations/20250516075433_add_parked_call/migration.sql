/*
  Warnings:

  - You are about to drop the column `subscriptionId` on the `Agent` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Agent" DROP CONSTRAINT "Agent_subscriptionId_fkey";

-- AlterTable
ALTER TABLE "Agent" DROP COLUMN "subscriptionId";
