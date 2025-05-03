/*
  Warnings:

  - A unique constraint covering the columns `[sipUname]` on the table `Agent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Agent_sipUname_key" ON "Agent"("sipUname");
