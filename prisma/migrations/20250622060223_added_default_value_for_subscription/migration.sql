/*
  Warnings:

  - Made the column `isSMSSubscribed` on table `Subscription` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "isSMSSubscribed" SET NOT NULL,
ALTER COLUMN "isSMSSubscribed" SET DEFAULT false;
