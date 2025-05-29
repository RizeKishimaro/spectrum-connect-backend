/*
  Warnings:

  - A unique constraint covering the columns `[systemCompanyId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "User_systemCompanyId_key" ON "User"("systemCompanyId");
