/*
  Warnings:

  - Added the required column `password` to the `Agent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "password" TEXT NOT NULL;
