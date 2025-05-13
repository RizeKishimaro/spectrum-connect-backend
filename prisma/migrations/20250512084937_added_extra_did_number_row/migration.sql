/*
  Warnings:

  - Added the required column `DIDNumber` to the `SIPProvider` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SIPProvider" ADD COLUMN     "DIDNumber" TEXT NOT NULL;
