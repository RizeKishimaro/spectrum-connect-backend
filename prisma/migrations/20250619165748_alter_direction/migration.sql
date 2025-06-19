/*
  Warnings:

  - You are about to drop the column `directon` on the `sms_logs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sms_logs" DROP COLUMN "directon",
ADD COLUMN     "direction" TEXT;
