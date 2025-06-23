/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `IVRTree` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "IVRTree_name_key" ON "IVRTree"("name");

-- CreateIndex
CREATE INDEX "IVRTree_name_id_systemCompanyId_idx" ON "IVRTree"("name", "id", "systemCompanyId");
