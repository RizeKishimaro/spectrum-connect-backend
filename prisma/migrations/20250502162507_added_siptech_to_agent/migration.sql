/*
  Warnings:

  - Added the required column `SIPTech` to the `Agent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "SIPTech" "SIPTech" NOT NULL;
