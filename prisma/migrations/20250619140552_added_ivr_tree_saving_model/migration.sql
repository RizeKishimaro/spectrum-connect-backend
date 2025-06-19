-- CreateTable
CREATE TABLE "IVRTree" (
    "id" TEXT NOT NULL,
    "tree" JSONB NOT NULL,
    "systemCompanyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IVRTree_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "IVRTree" ADD CONSTRAINT "IVRTree_systemCompanyId_fkey" FOREIGN KEY ("systemCompanyId") REFERENCES "SystemCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
