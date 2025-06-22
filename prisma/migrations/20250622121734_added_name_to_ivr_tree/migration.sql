/*
  Warnings:

  - Added the required column `name` to the `IVRTree` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "IVRTree" ADD COLUMN     "name" TEXT NOT NULL;
